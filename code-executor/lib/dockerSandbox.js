const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createTraceId } = require('../../shared/trace');
const { createLogger } = require('../../shared/logger');
const { config } = require('./config');
const { acquireExecutionSlot } = require('./semaphore');
const { sandboxJobsTotal } = require('./metrics');
const { countArtifacts, getArtifact, sourceHash, storeArtifact } = require('./artifactStore');

const logger = createLogger('executor.sandbox');
fs.mkdirSync(config.artifactTmpDir, { recursive: true });

const LANGUAGES = {
  python: {
    sourceFile: 'main.py',
    artifactFile: 'main.py',
    compileCommand: "python3 -c \"import py_compile; py_compile.compile('/sandbox/submission/main.py', cfile='/sandbox/output/main.pyc', doraise=True)\" && cp /sandbox/submission/main.py /sandbox/output/main.py",
    runCommand: () => 'python3 /sandbox/artifact/main.py',
  },
  javascript: {
    sourceFile: 'main.js',
    artifactFile: 'main.js',
    compileCommand: 'node --check /sandbox/submission/main.js && cp /sandbox/submission/main.js /sandbox/output/main.js',
    runCommand: () => 'node /sandbox/artifact/main.js',
  },
  c: {
    sourceFile: 'main.c',
    artifactFile: 'main.bin',
    compileCommand: 'gcc /sandbox/submission/main.c -O2 -pipe -o /sandbox/output/main.bin -lm',
    runCommand: () => '/sandbox/artifact/main.bin',
  },
  cpp: {
    sourceFile: 'main.cpp',
    artifactFile: 'main.bin',
    compileCommand: 'g++ /sandbox/submission/main.cpp -O2 -pipe -std=c++17 -o /sandbox/output/main.bin -lm',
    runCommand: () => '/sandbox/artifact/main.bin',
  },
  java: {
    artifactFile: 'main.jar',
    compileCommand: (mainClass, sourceFile) => `mkdir -p /sandbox/output/classes && javac -d /sandbox/output/classes /sandbox/submission/${sourceFile} && jar --create --file /sandbox/output/main.jar -C /sandbox/output/classes .`,
    runCommand: (meta) => `java -cp /sandbox/artifact/main.jar ${meta.mainClass}`,
  },
};

function languageConfig(language) {
  const normalized = String(language || '').toLowerCase();
  const lang = LANGUAGES[normalized];
  if (!lang) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return { normalized, lang };
}

function sanitizeJavaClassName(code) {
  const match = String(code || '').match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : 'Main';
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(config.artifactTmpDir, `${prefix}-`));
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best effort cleanup
  }
}

function mountArg({ src, dst, readOnly = false }) {
  return `type=bind,src=${src},dst=${dst}${readOnly ? ',readonly' : ''}`;
}

function removeContainer(name) {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['rm', '-f', name], { stdio: 'ignore' });
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
  });
}

function inspectContainer(name) {
  return new Promise((resolve) => {
    let output = '';
    const proc = spawn('docker', ['inspect', name, '--format', '{{json .State}}'], { stdio: ['ignore', 'pipe', 'ignore'] });
    proc.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    proc.on('close', () => {
      try {
        resolve(output ? JSON.parse(output.trim()) : null);
      } catch (_) {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}

function parseUsage(stderr) {
  const lines = String(stderr || '').split(/\r?\n/);
  let memoryUsedMb = null;
  const filtered = [];
  for (const line of lines) {
    if (line.startsWith('__METRIC__ ')) {
      const kb = Number(line.replace('__METRIC__ ', '').trim());
      if (Number.isFinite(kb)) {
        memoryUsedMb = Math.max(1, Math.ceil(kb / 1024));
      }
      continue;
    }
    filtered.push(line);
  }
  return {
    stderr: filtered.join('\n').trim(),
    memoryUsedMb,
  };
}

function limitedAppend(current, chunk, maxBytes) {
  if (current.length >= maxBytes) {
    return current;
  }
  const combined = current + chunk;
  return combined.length > maxBytes ? combined.slice(0, maxBytes) : combined;
}

function runDockerContainer({ shellCommand, mounts, timeoutMs, memoryLimitMb, stdin = '', traceId, phase }) {
  return new Promise((resolve) => {
    const containerName = `exec-${phase}-${createTraceId().slice(0, 12)}`;
    const args = [
      'run',
      '--name',
      containerName,
      '--network',
      'none',
      '--read-only',
      '--pids-limit',
      String(config.pidsLimit),
      '--memory',
      `${Math.min(memoryLimitMb || config.defaultMemoryLimitMb, config.maxMemoryLimitMb)}m`,
      '--cpus',
      '1.0',
      '--tmpfs',
      '/tmp:rw,exec,nosuid,size=64m',
      '--security-opt',
      'no-new-privileges',
      '--cap-drop',
      'ALL',
      '--user',
      'sandbox',
    ];

    for (const mount of mounts) {
      args.push('--mount', mountArg(mount));
    }

    args.push(config.runnerImage, '/bin/bash', '-lc', shellCommand);

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const startedAt = Date.now();
    const proc = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(async () => {
      timedOut = true;
      await removeContainer(containerName);
    }, timeoutMs);

    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();

    proc.stdout.on('data', (chunk) => {
      stdout = limitedAppend(stdout, chunk.toString(), config.maxStdoutBytes);
    });

    proc.stderr.on('data', (chunk) => {
      stderr = limitedAppend(stderr, chunk.toString(), config.maxStderrBytes);
    });

    proc.on('close', async (code) => {
      clearTimeout(timer);
      const state = await inspectContainer(containerName);
      await removeContainer(containerName);
      const usage = parseUsage(stderr);
      const result = {
        stdout,
        stderr: usage.stderr,
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt,
        memoryUsedMb: usage.memoryUsedMb,
      };

      if (timedOut) {
        result.stderr = 'Time Limit Exceeded';
        result.exitCode = 124;
      } else if (state?.OOMKilled) {
        result.stderr = 'Memory Limit Exceeded';
        result.exitCode = 137;
      }

      resolve(result);
    });

    proc.on('error', async (error) => {
      clearTimeout(timer);
      await removeContainer(containerName);
      logger.error('Docker invocation failed', { error, traceId, phase });
      resolve({
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        memoryUsedMb: null,
      });
    });
  });
}

async function withSlot(operation, language, work) {
  let release;
  try {
    release = await acquireExecutionSlot();
  } catch (error) {
    sandboxJobsTotal.inc({ operation, language, status: 'queue_timeout' });
    throw error;
  }

  try {
    const result = await work();
    sandboxJobsTotal.inc({ operation, language, status: 'ok' });
    return result;
  } catch (error) {
    sandboxJobsTotal.inc({ operation, language, status: 'error' });
    throw error;
  } finally {
    await release();
  }
}

function normalizeLimits({ timeLimitMs, memoryLimitMb }) {
  return {
    timeLimitMs: Math.max(250, Number(timeLimitMs) || config.defaultTimeLimitMs),
    memoryLimitMb: Math.max(64, Math.min(Number(memoryLimitMb) || config.defaultMemoryLimitMb, config.maxMemoryLimitMb)),
  };
}

async function compileInSandbox({ language, code, timeLimitMs, memoryLimitMb, traceId }) {
  const { normalized, lang } = languageConfig(language);
  const artifactId = sourceHash(normalized, code);
  const cached = await getArtifact(artifactId);
  if (cached) {
    return { artifactId, cacheHit: true };
  }

  const limits = normalizeLimits({ timeLimitMs, memoryLimitMb });
  const workDir = tempDir('compile');
  const submissionDir = path.join(workDir, 'submission');
  const outputDir = path.join(workDir, 'output');
  fs.mkdirSync(submissionDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  let sourceFile = lang.sourceFile;
  let compileCommand = lang.compileCommand;
  const meta = { language: normalized };

  if (normalized === 'java') {
    const mainClass = sanitizeJavaClassName(code);
    sourceFile = `${mainClass}.java`;
    compileCommand = lang.compileCommand(mainClass, sourceFile);
    meta.mainClass = mainClass;
  }

  fs.writeFileSync(path.join(submissionDir, sourceFile), code);

  try {
    const compileResult = await withSlot('compile', normalized, () => runDockerContainer({
      shellCommand: compileCommand,
      mounts: [
        { src: submissionDir, dst: '/sandbox/submission', readOnly: true },
        { src: outputDir, dst: '/sandbox/output' },
      ],
      timeoutMs: Math.max(limits.timeLimitMs, config.compileTimeoutMs),
      memoryLimitMb: limits.memoryLimitMb,
      traceId,
      phase: 'compile',
    }));

    if (compileResult.exitCode !== 0) {
      return { compile_output: compileResult.stderr || compileResult.stdout };
    }

    const artifactPath = path.join(outputDir, lang.artifactFile);
    const data = fs.readFileSync(artifactPath);
    await storeArtifact({
      artifactId,
      meta: { ...meta, language: normalized, artifactFile: lang.artifactFile },
      data,
    });

    return { artifactId, cacheHit: false };
  } finally {
    cleanupDir(workDir);
  }
}

async function runArtifactOnce({ artifact, stdin, timeLimitMs, memoryLimitMb, traceId }) {
  const { normalized, lang } = languageConfig(artifact.meta.language);
  const limits = normalizeLimits({ timeLimitMs, memoryLimitMb });
  const workDir = tempDir('run');
  const artifactDir = path.join(workDir, 'artifact');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, artifact.meta.artifactFile), artifact.data);

  try {
    const runCommand = `/usr/bin/time -f '__METRIC__ %M' ${lang.runCommand(artifact.meta)}`;
    return await withSlot('run', normalized, () => runDockerContainer({
      shellCommand: runCommand,
      mounts: [
        { src: artifactDir, dst: '/sandbox/artifact', readOnly: true },
      ],
      timeoutMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
      stdin,
      traceId,
      phase: 'run',
    }));
  } finally {
    cleanupDir(workDir);
  }
}

async function runStoredArtifactBatch({ artifactId, inputs, timeLimitMs, memoryLimitMb, traceId }) {
  const artifact = await getArtifact(artifactId);
  if (!artifact) {
    throw new Error('Artifact not found');
  }

  const results = new Array(inputs.length);
  const workerCount = Math.max(1, Math.min(config.batchCaseConcurrency, inputs.length || 1));
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= inputs.length) {
        return;
      }
      results[index] = await runArtifactOnce({
        artifact,
        stdin: inputs[index] || '',
        timeLimitMs,
        memoryLimitMb,
        traceId,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { results };
}

async function executeOnce({ language, code, stdin = '', timeLimitMs, memoryLimitMb, traceId }) {
  const compileResult = await compileInSandbox({ language, code, timeLimitMs, memoryLimitMb, traceId });
  if (compileResult.compile_output) {
    return {
      stdout: '',
      stderr: compileResult.compile_output,
      compile_output: compileResult.compile_output,
      exitCode: 1,
      durationMs: null,
      memoryUsedMb: null,
    };
  }

  const batch = await runStoredArtifactBatch({
    artifactId: compileResult.artifactId,
    inputs: [stdin],
    timeLimitMs,
    memoryLimitMb,
    traceId,
  });

  return batch.results[0];
}

async function cacheStats() {
  return {
    artifacts: await countArtifacts(),
    ttlSeconds: config.artifactTtlSec,
  };
}

module.exports = {
  cacheStats,
  compileInSandbox,
  executeOnce,
  runStoredArtifactBatch,
};
