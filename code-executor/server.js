const cluster = require('cluster');
const os = require('os');

// ─── Cluster mode: fork one worker per CPU core ───────────────────────────────
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`[cluster] Primary ${process.pid} starting ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`[cluster] Worker ${worker.process.pid} died — restarting`);
    cluster.fork();
  });
} else {

  const express = require('express');
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const { v4: uuidv4 } = require('uuid');

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const PORT = process.env.PORT || 8080;

  // ─── Tunable constants ────────────────────────────────────────────────────────
  const TIMEOUT_MS = 15_000;              // 15s per compile/run step
  const CORES = os.cpus().length;
  const MAX_CONCURRENT = Math.max(12, CORES * 3); // optimal balance: 3x cores
  const QUEUE_TIMEOUT_MS = 8_000;               // reject if waiting >8s in queue
  const MAX_STDOUT_BYTES = 200_000;             // 200 KB
  const MAX_STDERR_BYTES = 50_000;              // 50 KB

  // ─── RAM-disk temp dir (zero disk I/O on Linux EC2) ──────────────────────────
  // /dev/shm is a tmpfs (RAM-backed) filesystem available on all Linux hosts.
  // Falls back to os.tmpdir() for Windows local dev.
  const TMPBASE = (() => {
    try {
      fs.accessSync('/dev/shm', fs.constants.W_OK);
      console.log('[startup] Using /dev/shm (RAM disk) for temp files');
      return '/dev/shm';
    } catch (_) {
      console.log(`[startup] /dev/shm not available — using ${os.tmpdir()}`);
      return os.tmpdir();
    }
  })();

  // ─── Compile cache ────────────────────────────────────────────────────────────
  // Key: SHA-256(language + code) → Value: { binPath, dir, lang, hits, ts }
  // Avoids recompiling identical submissions (very common in exams).
  const CACHE_MAX = 200;                    // max cached compiled binaries
  const CACHE_TTL_MS = 10 * 60 * 1000;        // 10 min TTL
  const compileCache = new Map();              // insertion-ordered → easy LRU eviction

  function cacheKey(language, code) {
    return crypto.createHash('sha256').update(language + '\x00' + code).digest('hex');
  }

  function cacheGet(key) {
    const entry = compileCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      compileCache.delete(key);
      cleanupDir(entry.dir);
      return null;
    }
    // Refresh recency (move to end)
    compileCache.delete(key);
    entry.hits++;
    entry.ts = Date.now();
    compileCache.set(key, entry);
    return entry;
  }

  function cacheSet(key, value) {
    if (compileCache.size >= CACHE_MAX) {
      // Evict oldest entry (first inserted)
      const oldest = compileCache.keys().next().value;
      const old = compileCache.get(oldest);
      compileCache.delete(oldest);
      cleanupDir(old.dir);
    }
    compileCache.set(key, { ...value, hits: 0, ts: Date.now() });
  }

  function cleanupCacheEntry(key) {
    const entry = compileCache.get(key);
    if (entry) {
      compileCache.delete(key);
      cleanupDir(entry.dir);
    }
  }

  // Periodic eviction of stale cache entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of compileCache) {
      if (now - entry.ts > CACHE_TTL_MS) {
        compileCache.delete(key);
        cleanupDir(entry.dir);
      }
    }
  }, 60_000); // every minute

  // ─── Semaphore (in-memory FIFO queue) with queue timeout ──────────────────────
  let activeCount = 0;
  const waitQueue = []; // { resolve, reject, timer }

  function acquireSemaphore() {
    return new Promise((resolve, reject) => {
      if (activeCount < MAX_CONCURRENT) {
        activeCount++;
        console.log(`[concurrency] slot acquired — active=${activeCount}/${MAX_CONCURRENT} queued=${waitQueue.length}`);
        resolve();
      } else {
        // Set a timeout so requests don't wait forever
        const timer = setTimeout(() => {
          const idx = waitQueue.findIndex(w => w.timer === timer);
          if (idx !== -1) waitQueue.splice(idx, 1);
          console.warn(`[concurrency] queue timeout — active=${activeCount} queued=${waitQueue.length}`);
          reject(new Error('QUEUE_TIMEOUT'));
        }, QUEUE_TIMEOUT_MS);
        console.log(`[concurrency] queued — active=${activeCount}/${MAX_CONCURRENT} queued=${waitQueue.length + 1}`);
        waitQueue.push({ resolve, reject, timer });
      }
    });
  }

  function releaseSemaphore() {
    if (waitQueue.length > 0) {
      const next = waitQueue.shift();
      clearTimeout(next.timer);
      console.log(`[concurrency] slot handed off — active=${activeCount} queued=${waitQueue.length}`);
      next.resolve(); // activeCount stays same: one out, one in
    } else {
      activeCount--;
      console.log(`[concurrency] slot released — active=${activeCount}/${MAX_CONCURRENT} queued=0`);
    }
  }

  // ─── Language config ──────────────────────────────────────────────────────────
  const LANG_CONFIG = {
    python: {
      ext: 'py', compiled: false,
      run: (file) => ['python3', [file]],
    },
    javascript: {
      ext: 'js', compiled: false,
      run: (file) => ['node', [file]],
    },
    c: {
      ext: 'c', compiled: true,
      compile: (src, bin) => ['gcc', [src, '-o', bin, '-lm']],
      run: (_, bin) => [bin, []],
    },
    cpp: {
      ext: 'cpp', compiled: true,
      compile: (src, bin) => ['g++', [src, '-o', bin, '-std=c++17', '-lm']],
      run: (_, bin) => [bin, []],
    },
    java: {
      ext: 'java', compiled: true,
      compile: (src, dir) => ['javac', ['-d', dir, src]],
      run: (_, dir, className) => ['java', ['-cp', dir, className]],
    },
  };

  // ─── Core process runner ──────────────────────────────────────────────────────
  function runProcess(cmd, args, stdin, timeoutMs) {
    return new Promise((resolve) => {
      let stdoutBuf = '';
      let stderrBuf = '';
      let timedOut = false;
      let stdoutTruncated = false;
      let stderrTruncated = false;

      const proc = spawn(cmd, args, { shell: false });
      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch (_) { }
      }, timeoutMs);

      if (stdin) { try { proc.stdin.write(stdin); } catch (_) { } }
      try { proc.stdin.end(); } catch (_) { }

      proc.stdout.on('data', (chunk) => {
        if (stdoutBuf.length < MAX_STDOUT_BYTES) {
          stdoutBuf += chunk.toString();
          if (stdoutBuf.length > MAX_STDOUT_BYTES) {
            stdoutBuf = stdoutBuf.slice(0, MAX_STDOUT_BYTES);
            stdoutTruncated = true;
          }
        }
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

  function mergeFlag(result, extraFlag = false) {
    const flagged = result.output_truncated || extraFlag;
    const out = {
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output != null ? result.compile_output : '',
      exitCode: result.exitCode,
    };
    if (flagged) out.output_truncated = true;
    return out;
  }

  // ─── Health + Stats ───────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      status: 'ok', service: 'code-executor',
      active: activeCount, queued: waitQueue.length,
      maxConcurrent: MAX_CONCURRENT, cacheSize: compileCache.size,
      pid: process.pid,
    });
  });

  app.get('/stats', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      pid: process.pid, cores: CORES,
      active: activeCount, queued: waitQueue.length,
      maxConcurrent: MAX_CONCURRENT, queueTimeoutMs: QUEUE_TIMEOUT_MS,
      tmpBase: TMPBASE,
      memUsedMB: Math.round(mem.rss / 1024 / 1024),
      uptimeS: Math.round(process.uptime()),
      cache: { size: compileCache.size, maxSize: CACHE_MAX, ttlMin: CACHE_TTL_MS / 60_000 },
    });
  });

  // ─── GET /cache/stats ─────────────────────────────────────────────────────────
  // Shows compile cache hit details (useful for monitoring exam traffic)
  app.get('/cache/stats', (req, res) => {
    const entries = [];
    for (const [key, entry] of compileCache) {
      entries.push({
        key: key.slice(0, 12) + '...',
        lang: entry.lang,
        hits: entry.hits,
        ageMin: ((Date.now() - entry.ts) / 60_000).toFixed(1),
      });
    }
    res.json({ size: compileCache.size, maxSize: CACHE_MAX, entries });
  });

  // ─── DELETE /cache ────────────────────────────────────────────────────────────
  app.delete('/cache', (req, res) => {
    const before = compileCache.size;
    for (const [key, entry] of compileCache) {
      compileCache.delete(key);
      cleanupDir(entry.dir);
    }
    res.json({ cleared: before });
  });

  // ─── POST /execute ────────────────────────────────────────────────────────────
  app.post('/execute', async (req, res) => {
    const { language, code, stdin = '' } = req.body;
    if (!language || !code) return res.status(400).json({ error: 'language and code are required' });

    const lang = LANG_CONFIG[language.toLowerCase()];
    if (!lang) return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_CONFIG).join(', ')}` });

    const t0 = Date.now();
    try { await acquireSemaphore(); }
    catch (err) {
      if (err.message === 'QUEUE_TIMEOUT') return res.status(503).json({ error: 'Server busy — queue timeout. Please retry in a moment.' });
      return res.status(500).json({ error: err.message });
    }
    const queueWait = Date.now() - t0;

    const runId = uuidv4().slice(0, 8);
    const tmpDir = path.join(TMPBASE, `exec_${runId}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      let result;
      let compileMs = 0, runMs = 0;
      let cacheHit = false;

      if (language.toLowerCase() === 'java') {
        // ── Java: always compile (class name varies) ───────────────────────────
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        const srcFile = path.join(tmpDir, `${className}.java`);
        fs.writeFileSync(srcFile, code);

        const tc = Date.now();
        const [cCmd, cArgs] = lang.compile(srcFile, tmpDir);
        const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);
        compileMs = Date.now() - tc;

        if (compileResult.exitCode !== 0) {
          const errText = compileResult.stderr || compileResult.stdout;
          return res.json(mergeFlag({ stdout: '', stderr: errText, compile_output: errText, exitCode: compileResult.exitCode, output_truncated: compileResult.output_truncated }));
        }

        const tr = Date.now();
        const [rCmd, rArgs] = lang.run(null, tmpDir, className);
        result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);
        runMs = Date.now() - tr;

      } else if (lang.compiled) {
        // ── C/C++: check compile cache ─────────────────────────────────────────
        const key = cacheKey(language.toLowerCase(), code);
        let cached = cacheGet(key);
        let binPath;

        if (cached) {
          cacheHit = true;
          binPath = cached.binPath;
          console.log(`[cache] HIT hash=${key.slice(0, 12)} lang=${language} hits=${cached.hits}`);
        } else {
          const srcFile = path.join(tmpDir, `main.${lang.ext}`);
          const binFile = path.join(tmpDir, 'main');
          fs.writeFileSync(srcFile, code);

          const tc = Date.now();
          const [cCmd, cArgs] = lang.compile(srcFile, binFile);
          const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);
          compileMs = Date.now() - tc;

          if (compileResult.exitCode !== 0) {
            const errText = compileResult.stderr || compileResult.stdout;
            return res.json(mergeFlag({ stdout: '', stderr: errText, compile_output: errText, exitCode: compileResult.exitCode, output_truncated: compileResult.output_truncated }));
          }

          // Store in cache — the binFile dir is now owned by cache, don't cleanup
          cacheSet(key, { binPath: binFile, dir: tmpDir, lang: language });
          binPath = binFile;
          console.log(`[cache] MISS hash=${key.slice(0, 12)} lang=${language} compiled in ${compileMs}ms`);
        }

        const [rCmd, rArgs] = lang.run(null, binPath);
        const tr = Date.now();
        result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);
        runMs = Date.now() - tr;

      } else {
        // ── Interpreted (Python, JS) ───────────────────────────────────────────
        const srcFile = path.join(tmpDir, `main.${lang.ext}`);
        fs.writeFileSync(srcFile, code);

        const [rCmd, rArgs] = lang.run(srcFile);
        const tr = Date.now();
        result = await runProcess(rCmd, rArgs, stdin, TIMEOUT_MS);
        runMs = Date.now() - tr;
      }

      const total = Date.now() - t0;
      console.log(`[execute] id=${runId} lang=${language} queue=${queueWait}ms compile=${compileMs}ms run=${runMs}ms total=${total}ms cache=${cacheHit ? 'HIT' : 'MISS'} active=${activeCount}`);
      res.json(mergeFlag(result));

    } catch (err) {
      console.error(`[execute] ERROR id=${runId}:`, err);
      res.status(500).json({ error: 'Internal execution error', detail: err.message });
    } finally {
      const key = (lang && lang.compiled && language && language.toLowerCase() !== 'java')
        ? cacheKey(language.toLowerCase(), code) : null;
      if (!key || !compileCache.has(key)) cleanupDir(tmpDir);
      releaseSemaphore();
    }
  });

  // ─── POST /batch ──────────────────────────────────────────────────────────────
  // Compiles once (with cache), runs all test cases in parallel.
  app.post('/batch', async (req, res) => {
    const { language, code, inputs } = req.body;
    if (!language || !code || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'language, code, and inputs[] are required' });
    }

    const lang = LANG_CONFIG[language.toLowerCase()];
    if (!lang) return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_CONFIG).join(', ')}` });

    const t0 = Date.now();
    try { await acquireSemaphore(); }
    catch (err) {
      if (err.message === 'QUEUE_TIMEOUT') return res.status(503).json({ error: 'Server busy — queue timeout. Please retry in a moment.' });
      return res.status(500).json({ error: err.message });
    }
    const queueWait = Date.now() - t0;

    const runId = uuidv4().slice(0, 8);
    const tmpDir = path.join(TMPBASE, `batch_${runId}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      let runCmd, runArgs;
      let compileError = null;
      let compileTruncated = false;
      let compileMs = 0;
      let cacheHit = false;

      // ── Compile (with cache for C/C++) ─────────────────────────────────────────
      const tc = Date.now();

      if (language.toLowerCase() === 'java') {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        const srcFile = path.join(tmpDir, `${className}.java`);
        fs.writeFileSync(srcFile, code);

        const [cCmd, cArgs] = lang.compile(srcFile, tmpDir);
        const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);
        compileMs = Date.now() - tc;

        if (compileResult.exitCode !== 0) {
          compileError = compileResult.stderr || compileResult.stdout;
          compileTruncated = compileResult.output_truncated;
        } else {
          [runCmd, runArgs] = lang.run(null, tmpDir, className);
        }

      } else if (lang.compiled) {
        const key = cacheKey(language.toLowerCase(), code);
        let cached = cacheGet(key);

        if (cached) {
          cacheHit = true;
          [runCmd, runArgs] = lang.run(null, cached.binPath);
          console.log(`[cache] HIT hash=${key.slice(0, 12)} lang=${language} hits=${cached.hits}`);
        } else {
          const srcFile = path.join(tmpDir, `main.${lang.ext}`);
          const binFile = path.join(tmpDir, 'main');
          fs.writeFileSync(srcFile, code);

          const [cCmd, cArgs] = lang.compile(srcFile, binFile);
          const compileResult = await runProcess(cCmd, cArgs, '', TIMEOUT_MS);
          compileMs = Date.now() - tc;

          if (compileResult.exitCode !== 0) {
            compileError = compileResult.stderr || compileResult.stdout;
            compileTruncated = compileResult.output_truncated;
          } else {
            cacheSet(key, { binPath: binFile, dir: tmpDir, lang: language });
            [runCmd, runArgs] = lang.run(null, binFile);
            console.log(`[cache] MISS hash=${key.slice(0, 12)} lang=${language} compiled in ${compileMs}ms`);
          }
        }

      } else {
        const srcFile = path.join(tmpDir, `main.${lang.ext}`);
        fs.writeFileSync(srcFile, code);
        [runCmd, runArgs] = lang.run(srcFile);
      }

      // ── Compile failed — propagate error for every test case ───────────────────
      if (compileError !== null) {
        const results = inputs.map(() => {
          const entry = { stdout: '', stderr: compileError, compile_output: compileError, exitCode: 1 };
          if (compileTruncated) entry.output_truncated = true;
          return entry;
        });
        return res.json({ results });
      }

      // ── Run all test cases in parallel ─────────────────────────────────────────
      const tr = Date.now();
      const results = await Promise.all(
        inputs.map((stdin) => runProcess(runCmd, runArgs, stdin, TIMEOUT_MS).then(mergeFlag))
      );
      const runMs = Date.now() - tr;
      const total = Date.now() - t0;

      console.log(`[batch] id=${runId} lang=${language} cases=${inputs.length} queue=${queueWait}ms compile=${compileMs}ms run=${runMs}ms total=${total}ms cache=${cacheHit ? 'HIT' : 'MISS'} active=${activeCount}`);
      res.json({ results });

    } catch (err) {
      console.error(`[batch] ERROR id=${runId}:`, err);
      res.status(500).json({ error: 'Internal batch execution error', detail: err.message });
    } finally {
      const key = (lang && lang.compiled && language && language.toLowerCase() !== 'java')
        ? cacheKey(language.toLowerCase(), code) : null;
      if (!key || !compileCache.has(key)) cleanupDir(tmpDir);
      releaseSemaphore();
    }
  });

  app.listen(PORT, () => {
    console.log(`[worker ${process.pid}] Code executor running on port ${PORT}`);
    console.log(`Cores: ${CORES} | Max concurrent: ${MAX_CONCURRENT} | Queue timeout: ${QUEUE_TIMEOUT_MS}ms`);
    console.log(`Temp dir: ${TMPBASE} | Compile cache: max=${CACHE_MAX} ttl=${CACHE_TTL_MS / 60_000}min`);
    console.log(`Supported languages: ${Object.keys(LANG_CONFIG).join(', ')}`);
  });

} // end cluster worker block
