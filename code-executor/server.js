const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const TIMEOUT_MS = 10000; // 10 second execution limit

// Language config: extension, compile command (optional), run command
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
    // Java requires the public class name to match filename
    compile: (src, dir) => ['javac', ['-d', dir, src]],
    run: (_, dir, className) => ['java', ['-cp', dir, className]],
  },
};

// Run a child process with timeout, returning { stdout, stderr, exitCode }
function runProcess(cmd, args, stdin, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(cmd, args, { shell: false });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.slice(0, 50000), // cap output
        stderr: timedOut
          ? 'Time Limit Exceeded (10 seconds)'
          : stderr.slice(0, 10000),
        exitCode: timedOut ? 124 : (code !== null && code !== undefined ? code : 0),
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'code-executor' });
});

// POST /execute — main execution endpoint
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

  const runId = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `exec_${runId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    let result;

    if (language.toLowerCase() === 'java') {
      // Extract class name from code (default to Main if not found)
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const srcFile = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(srcFile, code);

      // Compile
      const [compileCmd, compileArgs] = lang.compile(srcFile, tmpDir);
      const compileResult = await runProcess(compileCmd, compileArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        return res.json({
          stdout: '',
          stderr: compileResult.stderr || compileResult.stdout,
          compile_output: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode,
        });
      }

      // Run
      const [runCmd, runArgs] = lang.run(null, tmpDir, className);
      result = await runProcess(runCmd, runArgs, stdin, TIMEOUT_MS);

    } else if (lang.compile) {
      // C or C++
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      const binFile = path.join(tmpDir, 'main');
      fs.writeFileSync(srcFile, code);

      // Compile
      const [compileCmd, compileArgs] = lang.compile(srcFile, binFile);
      const compileResult = await runProcess(compileCmd, compileArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        return res.json({
          stdout: '',
          stderr: compileResult.stderr || compileResult.stdout,
          compile_output: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode,
        });
      }

      // Run
      const [runCmd, runArgs] = lang.run(srcFile, binFile);
      result = await runProcess(runCmd, runArgs, stdin, TIMEOUT_MS);

    } else {
      // Python or JavaScript — interpreted, no compile step
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      fs.writeFileSync(srcFile, code);

      const [runCmd, runArgs] = lang.run(srcFile);
      result = await runProcess(runCmd, runArgs, stdin, TIMEOUT_MS);
    }

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: '',
      exitCode: result.exitCode,
    });

  } catch (err) {
    console.error('Execution error:', err);
    res.status(500).json({ error: 'Internal execution error', detail: err.message });
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { }
  }
});

// POST /batch — compile once, run once per test case
// Body: { language, code, inputs: string[] }
// Returns: { results: Array<{ stdout, stderr, compile_output, exitCode }> }
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

  const runId = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `batch_${runId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // ── Step 1: Compile (once) ─────────────────────────────────────────────
    let runCmd, runArgs;
    let compileError = null;

    if (language.toLowerCase() === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const srcFile = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, tmpDir);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        compileError = compileResult.stderr || compileResult.stdout;
      } else {
        [runCmd, runArgs] = lang.run(null, tmpDir, className);
      }

    } else if (lang.compile) {
      // C / C++
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      const binFile = path.join(tmpDir, 'main');
      fs.writeFileSync(srcFile, code);

      const [cCmd, cArgs] = lang.compile(srcFile, binFile);
      const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);

      if (compileResult.exitCode !== 0) {
        compileError = compileResult.stderr || compileResult.stdout;
      } else {
        [runCmd, runArgs] = lang.run(srcFile, binFile);
      }

    } else {
      // Python / JavaScript — no compile step
      const srcFile = path.join(tmpDir, `main.${lang.ext}`);
      fs.writeFileSync(srcFile, code);
      [runCmd, runArgs] = lang.run(srcFile);
    }

    // ── Step 2: Compile failed — return error for every test case ──────────
    if (compileError !== null) {
      const results = inputs.map(() => ({
        stdout: '',
        stderr: compileError,
        compile_output: compileError,
        exitCode: 1,
      }));
      return res.json({ results });
    }

    // ── Step 3: Run once per input (sequential, same binary) ──────────────
    const results = [];
    for (const stdin of inputs) {
      const result = await runProcess(runCmd, runArgs, stdin, TIMEOUT_MS);
      results.push({
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: '',
        exitCode: result.exitCode,
      });
    }

    res.json({ results });

  } catch (err) {
    console.error('Batch execution error:', err);
    res.status(500).json({ error: 'Internal batch execution error', detail: err.message });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { }
  }
});

app.listen(PORT, () => {
  console.log(`Code executor running on port ${PORT}`);
  console.log(`Supported languages: ${Object.keys(LANG_CONFIG).join(', ')}`);
});
