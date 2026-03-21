const { Worker } = require('bullmq');
const axios = require('axios');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/User');

const CODE_EXECUTOR_URL = process.env.CODE_EXECUTOR_URL || 'http://localhost:8080';

const LANGUAGE_MAP = {
    'c': 'c',
    'cpp': 'cpp',
    'java': 'java',
    'python': 'python',
    'javascript': 'javascript',
};

// ─── Redis connection ─────────────────────────────────────────────────────────
const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
};

// ─── ioredis client for result caching ────────────────────────────────────────
let redisClient = null;

function getRedisClient() {
    if (!redisClient) {
        const Redis = require('ioredis');
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        const tlsEnabled = url.startsWith('rediss://');

        redisClient = new Redis(url, {
            tls: tlsEnabled ? {} : undefined,
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });

        redisClient.on('error', (err) => {
            console.error('[worker] Redis client error:', err.message);
        });
    }
    return redisClient;
}

// Store job result in Redis with 10-minute TTL
async function storeResult(jobId, data) {
    try {
        const client = getRedisClient();
        await client.setex(`result:${jobId}`, 600, JSON.stringify(data));
    } catch (err) {
        console.error('[worker] Failed to store result in Redis:', err.message);
    }
}

// ─── Socket.IO helper — emit result to job room and user room ─────────────────
function emitResult(userId, jobId, payload) {
    try {
        // Lazy-require to avoid circular dependency (server.js requires this file)
        const { io } = require('../server');
        if (!io) return;

        // Emit to job-specific room (frontend subscribes to this on submit)
        io.to(`job:${jobId}`).emit('submission_result', payload);

        // Also emit to user's personal room (works even if tab was refreshed)
        if (userId) {
            io.to(`user:${userId}`).emit('submission_result', payload);
        }

        console.log(`[socket] Emitted submission_result for job=${jobId} user=${userId}`);
    } catch (err) {
        console.warn('[socket] Could not emit via Socket.IO:', err.message);
    }
}

// ─── Execute via code-executor /batch ─────────────────────────────────────────
async function executeCodeBatch(code, languageId, inputs = []) {
    const language = LANGUAGE_MAP[languageId] || languageId;
    console.log(`[worker] batch execute: ${inputs.length} test cases, language=${language}`);

    // Timeout: 30s cold-start + 40s per test case (capped at 5 min)
    const timeout = Math.min(300_000, 30_000 + inputs.length * 40_000);

    const response = await axios.post(`${CODE_EXECUTOR_URL}/batch`, {
        language,
        code,
        inputs,
    }, { timeout });

    const { results } = response.data;
    return results.map(r => ({
        stdout: r.stdout || '',
        stderr: r.stderr || '',
        compile_output: r.compile_output || '',
        exitCode: r.exitCode,
        time: null,
        memory: null,
    }));
}

// ─── Main BullMQ Worker ───────────────────────────────────────────────────────
const worker = new Worker(
    'submissions',
    async (job) => {
        const { problemId, code, language_id, userId, username, submissionId } = job.data;
        const t0 = Date.now();

        console.log(`[worker] ▶ Job ${job.id} started — submissionId=${submissionId} lang=${language_id}`);

        // ── Status: Processing ────────────────────────────────────────────────────
        await Submission.findByIdAndUpdate(submissionId, { status: 'Processing' }).catch(() => { });

        // ── Fetch problem ─────────────────────────────────────────────────────────
        const problem = await Problem.findById(problemId);
        if (!problem) throw new Error(`Problem ${problemId} not found`);

        // ── Build test cases ──────────────────────────────────────────────────────
        const allTestCases = [
            ...problem.sampleTestCases.map(tc => ({
                input: tc.isFileBased ? tc.inputFile : tc.input,
                expectedOutput: tc.isFileBased ? tc.outputFile : tc.expectedOutput,
                type: 'sample',
            })),
            ...problem.hiddenTestCases.map(tc => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                type: 'hidden',
            })),
        ];

        // ── Execute via code-executor ─────────────────────────────────────────────
        const inputs = allTestCases.map(tc => tc.input);
        const execResults = await executeCodeBatch(code, language_id, inputs);

        // ── Evaluate results ──────────────────────────────────────────────────────
        let passedCount = 0;
        const results = [];

        for (let i = 0; i < allTestCases.length; i++) {
            const tc = allTestCases[i];
            const result = execResults[i];
            const expectedOutput = tc.expectedOutput.trim();

            let passed = false;
            let error = null;
            let actualOutput = '';
            let status = 'Failed';

            if (result.compile_output) {
                status = 'Compilation Error';
                error = 'Compilation Error: ' + result.compile_output;
            } else if (result.stderr) {
                status = result.stderr.includes('Time Limit') ? 'Time Limit Exceeded' : 'Runtime Error';
                error = status + ': ' + result.stderr;
            } else {
                actualOutput = result.stdout.trim();
                passed = actualOutput === expectedOutput;
                status = passed ? 'Passed' : 'Wrong Answer';
                if (!passed) {
                    error = `Expected: ${expectedOutput.substring(0, 200)}, Got: ${actualOutput.substring(0, 200)}`;
                }
            }

            if (passed) passedCount++;

            const isHidden = tc.type === 'hidden';
            results.push({
                testCaseNumber: i + 1,
                type: tc.type,
                input: isHidden ? 'Hidden' : tc.input.substring(0, 200),
                expectedOutput: isHidden ? 'Hidden' : expectedOutput.substring(0, 200),
                actualOutput: isHidden ? 'Hidden' : actualOutput.substring(0, 200),
                passed,
                status,
                error,
                time: result.time,
                memory: result.memory,
            });
        }

        const verdict = passedCount === allTestCases.length ? 'Accepted' : 'Wrong Answer';
        const executionMs = Date.now() - t0;

        // ── Save final Submission ─────────────────────────────────────────────────
        await Submission.findByIdAndUpdate(submissionId, {
            status: verdict,
            passedTestCases: passedCount,
            totalTestCases: allTestCases.length,
            executionTime: executionMs,
            testCaseResults: results,
        });

        // ── Update user stats ─────────────────────────────────────────────────────
        const user = await User.findById(userId);
        if (user) {
            user.totalSubmissions = (user.totalSubmissions || 0) + 1;
            if (verdict === 'Accepted') {
                const hasPrevAccepted = await Submission.exists({
                    userId,
                    problemId,
                    status: 'Accepted',
                    _id: { $ne: submissionId },
                });
                if (!hasPrevAccepted) {
                    user.problemsSolved = (user.problemsSolved || 0) + 1;
                }
            }
            await user.save();
        }

        // ── Cache result in Redis (10-min TTL) ────────────────────────────────────
        const payload = {
            status: 'done',
            verdict,
            totalTestCases: allTestCases.length,
            passedTestCases: passedCount,
            testResults: results,
            submissionId,
            executionMs,
        };
        await storeResult(job.id, payload);

        // ── Push result via WebSocket ─────────────────────────────────────────────
        emitResult(userId, job.id, payload);

        console.log(`[worker] ✅ Job ${job.id} done — verdict=${verdict} (${passedCount}/${allTestCases.length}) in ${executionMs}ms`);
        return payload;
    },
    {
        connection,
        concurrency: 20,           // up to 20 parallel jobs per worker process
        lockDuration: 300_000,    // 5-min lock (prevents double-processing)
    }
);

// ─── Worker event hooks (Observability) ───────────────────────────────────────
worker.on('active', (job) => {
    console.log(`[worker] ⚡ Job ${job.id} is now active — submissionId=${job.data?.submissionId}`);
});

worker.on('completed', (job, result) => {
    console.log(`[worker] ✅ Job ${job.id} completed — verdict=${result?.verdict}`);
});

worker.on('failed', async (job, err) => {
    console.error(`[worker] ❌ Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts?.attempts}): ${err.message}`);

    const errorPayload = {
        status: 'error',
        error: err.message,
        submissionId: job?.data?.submissionId,
    };

    // Cache the failure so polling can surface it
    if (job?.id) await storeResult(job.id, errorPayload);

    // Mark submission as Internal Error
    if (job?.data?.submissionId) {
        await Submission.findByIdAndUpdate(job.data.submissionId, { status: 'Internal Error' }).catch(() => { });
    }

    // Push error via WebSocket so UI doesn't keep spinning
    emitResult(job?.data?.userId, job?.id, errorPayload);
});

worker.on('stalled', (jobId) => {
    console.warn(`[worker] ⚠️ Job ${jobId} stalled (worker likely crashed mid-job)`);
});

worker.on('error', (err) => {
    console.error('[worker] BullMQ worker error:', err.message);
});

console.log('[worker] BullMQ submission worker started ✅');
console.log(`[worker] Concurrency: 5 | Code executor: ${CODE_EXECUTOR_URL}`);

module.exports = { worker, getRedisClient };
