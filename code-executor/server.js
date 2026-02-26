const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;

// ─── Tunable constants ───────────────────────────────────────────────────────
const TIMEOUT_MS = 10_000;   // 10 s per compile/run step
const MAX_CONCURRENT = 3;        // global parallel execution limit
const MAX_STDOUT_BYTES = 200_000; // 200 KB
const MAX_STDERR_BYTES = 50_000; //  50 KB

// ─── Semaphore (in-memory FIFO queue, no Redis) ──────────────────────────────
let activeCount = 0;           // currently running executions
const waitQueue = [];          // resolve callbacks for queued requests

function acquireSemaphore() {
  return new Promise((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount++;
      console.log(`[concurrency] slot acquired — active=${activeCount} queued=${waitQueue.length}`);
      resolve();
    } else {
      console.log(`[concurrency] queued — active=${activeCount} queued=${waitQueue.length + 1}`);
      waitQueue.push(resolve);
    }
  });
}

function releaseSemaphore() {
  if (waitQueue.length > 0) {
    // hand the slot to the next waiter
    const next = waitQueue.shift();
    console.log(`[concurrency] slot handed off — active=${activeCount} queued=${waitQueue.length}`);
    next();          // activeCount stays the same: one out, one in
  } else {
    activeCount--;
    console.log(`[concurrency] slot released — active=${activeCount} queued=0`);
  }
}

// ─── Language config ─────────────────────────────────────────────────────────
const LANG_CONFIG = {
  python: {
    ext: 'py',
    run: (file) => ['python3', [file]],
  },
  javascript: {
    ext: 'js',
    run: (file) => ['node', [file]],
  },
  c: {
    ext: 'c',
    compile: (src, bin) => ['gcc', [src, '-o', bin, '-lm']],
    run: (_, bin) => [bin, []],
  },
  cpp: {
    ext: 'cpp',
    compile: (src, bin) => ['g++', [src, '-o', bin, '-std=c++17', '-lm']],
    run: (_, bin) => [bin, []],
  },
  java: {
    ext: 'java',
    compile: (src, dir) => ['javac', ['-d', dir, src]],
    run: (_, dir, className) => ['java', ['-cp', dir, className]],
  },
};

// ─── Core process runner ──────────────────────────────────────────────────────
// Returns { stdout, stderr, exitCode, output_truncated }
function runProcess(cmd, args, stdin, timeoutMs) {
  return new Promise((resolve) => {
    let stdoutBuf = '';
    let stderrBuf = '';
    let timedOut = false;
    let stdoutTruncated = false;
    let stderrTruncated = false;

    const proc = spawn(cmd, args, { shell: false });

    // Enforce timeout — kill the child and all its descendants
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGKILL'); } catch (_) { }
    }, timeoutMs);

    if (stdin) {
      try {
        proc.stdin.write(stdin);
      } catch (_) { }
    }
    try { proc.stdin.end(); } catch (_) { }

    proc.stdout.on('data', (chunk) => {
      if (stdoutBuf.length < MAX_STDOUT_BYTES) {
        stdoutBuf += chunk.toString();
        if (stdoutBuf.length > MAX_STDOUT_BYTES) {
          stdoutBuf = stdoutBuf.slice(0, MAX_STDOUT_BYTES);
          stdoutTruncated = true;
        }
      }
      // drop extra data — don't accumulate it
    });

    proc.stderr.on('data', (chunk) => {
      if (stderrBuf.length < MAX_STDERR_BYTES) {
        stderrBuf += chunk.toString();
        if (stderrBuf.length > MAX_STDERR_BYTES) {
          stderrBuf = stderrBuf.slice(0, MAX_STDERR_BYTES);
          stderrTruncated = true;
        }
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdoutBuf,
        stderr: timedOut ? 'Time Limit Exceeded' : stderrBuf,
        exitCode: timedOut ? 124 : (code !== null && code !== undefined ? code : 0),
        output_truncated: stdoutTruncated || stderrTruncated,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: 1, output_truncated: false });
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { }
}

// Merge output_truncated flag into a result object
function mergeFlag(result, extraFlag = false) {
  const flagged = result.output_truncated || extraFlag;
  const out = {
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output ?? '',
    exitCode: result.exitCode,
  };
  if (flagged) out.output_truncated = true;
  return out;
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'code-executor',
    active: activeCount,
    queued: waitQueue.length,
  });
});

// ─── POST /execute ────────────────────────────────────────────────────────────
app.post('/execute', async (req, res) => {
  const { language, code, stdin = '' } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'language and code are required' });
  }

  const lang = LANG_CONFIG[language.toLowerCase()];
  if (!lang) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_CONFIG).join(', ')}`,
    });
  }

  // Wait for a concurrency slot (FIFO)
  await acquireSemaphore();

  const runId = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `exec_${runId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`[execute] START runId=${runId} lang=${language}`);

  try {
    let result;

    if (language.toLowerCase() === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const srcFile = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, tmpDir);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        const errText = compileResult.stderr || compileResult.stdout;
        return res.json(mergeFlag({ stdout: '', stderr: errText, compile_output: errText, exitCode: compileResult.exitCode, output_truncated: compileResult.output_truncated }));
      }

      const [rCmd, rArgs] = lang.run(null, tmpDir, className);
      result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);

    } else if (lang.compile) {
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      const binFile = path.join(tmpDir, 'main');
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, binFile);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        const errText = compileResult.stderr || compileResult.stdout;
        return res.json(mergeFlag({ stdout: '', stderr: errText, compile_output: errText, exitCode: compileResult.exitCode, output_truncated: compileResult.output_truncated }));
      }

      const [rCmd, rArgs] = lang.run(srcFile, binFile);
      result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);

    } else {
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      fs.writeFileSync(srcFile, code);
      const [rCmd, rArgs] = lang.run(srcFile);
      result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);
    }

    res.json(mergeFlag(result));

  } catch (err) {
    console.error(`[execute] ERROR runId=${runId}:`, err);
    res.status(500).json({ error: 'Internal execution error', detail: err.message });
  } finally {
    cleanupDir(tmpDir);
    releaseSemaphore();
    console.log(`[execute] DONE  runId=${runId}`);
  }
});

// ─── POST /batch ──────────────────────────────────────────────────────────────
// Compiles once, runs once per test case sequentially.
app.post('/batch', async (req, res) => {
  const { language, code, inputs } = req.body;

  if (!language || !code || !Array.isArray(inputs)) {
    return res.status(400).json({ error: 'language, code, and inputs[] are required' });
  }

  const lang = LANG_CONFIG[language.toLowerCase()];
  if (!lang) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_CONFIG).join(', ')}`,
    });
  }

  // One semaphore slot covers the entire batch (compile + all runs)
  await acquireSemaphore();

  const runId = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `batch_${runId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`[batch] START runId=${runId} lang=${language} cases=${inputs.length}`);

  try {
    let runCmd, runArgs;
    let compileError = null;
    let compileTruncated = false;

    // ── Compile ──────────────────────────────────────────────────────────────
    if (language.toLowerCase() === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const srcFile = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, tmpDir);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        compileError = compileResult.stderr || compileResult.stdout;
        compileTruncated = compileResult.output_truncated;
      } else {
        [runCmd, runArgs] = lang.run(null, tmpDir, className);
      }

    } else if (lang.compile) {
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      const binFile = path.join(tmpDir, 'main');
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, binFile);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        compileError = compileResult.stderr || compileResult.stdout;
        compileTruncated = compileResult.output_truncated;
      } else {
        [runCmd, runArgs] = lang.run(srcFile, binFile);
      }

    } else {
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      fs.writeFileSync(srcFile, code);
      [runCmd, runArgs] = lang.run(srcFile);
    }

    // ── Compile failed — propagate error for every test case ─────────────────
    if (compileError !== null) {
      const results = inputs.map(() => {
        const entry = {
          stdout: '',
          stderr: compileError,
          compile_output: compileError,
          exitCode: 1,
        };
        if (compileTruncated) entry.output_truncated = true;
        return entry;
      });
      return res.json({ results });
    }

    // ── Run once per input (sequential — safe under the single slot) ─────────
    const results = [];
    for (const stdin of inputs) {
      const result = await runProcess(runCmd, runArgs, stdin, TIMEOUT_MS);
      results.push(mergeFlag(result));
    }

    res.json({ results });

  } catch (err) {
    console.error(`[batch] ERROR runId=${runId}:`, err);
    res.status(500).json({ error: 'Internal batch execution error', detail: err.message });
  } finally {
    cleanupDir(tmpDir);
    releaseSemaphore();
    console.log(`[batch] DONE  runId=${runId}`);
  }
});

app.listen(PORT, () => {
  console.log(`Code executor running on port ${PORT}`);
  console.log(`Supported languages: ${Object.keys(LANG_CONFIG).join(', ')}`);
  console.log(`Max concurrent executions: ${MAX_CONCURRENT}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms | stdout cap: ${MAX_STDOUT_BYTES}B | stderr cap: ${MAX_STDERR_BYTES}B`);
});
