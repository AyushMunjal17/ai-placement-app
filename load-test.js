/**
 * Load Test Script — AI Placement System
 * ----------------------------------------
 * Simulates N concurrent users each submitting code and polling for results.
 * Run: node load-test.js
 *
 * CONFIG (edit the section below):
 */

const axios = require('axios');

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
    baseUrl: 'http://54.172.179.224:5000/api',  // Backend URL
    email: 'ayushmunjal17@gmail.com',             // A real account in your DB
    password: 'Intensity@17',       // That account's password
    problemSlug: 'find-missing-number',   // Slug of a problem to submit against
    concurrentUsers: 50,                   // Change to 100 for higher load
    language: 'python',                   // Language to test with
    code: `
def find_missing(arr, n):
    total_sum = n * (n + 1) // 2
    array_sum = sum(arr)
    return total_sum - array_sum
  `.trim(),
    pollIntervalMs: 2000,   // How often to poll for result
    pollTimeoutMs: 90000,   // Give up after 90s
};
// ─── END CONFIG ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Step 1: Login and get token ───────────────────────────────────────────────
async function login() {
    const res = await axios.post(`${CONFIG.baseUrl}/auth/login`, {
        identifier: CONFIG.email,
        password: CONFIG.password,
    });
    return res.data.token;
}

// ── Step 2: Get the problem's MongoDB _id from its slug ──────────────────────
async function getProblemId(token) {
    const res = await axios.get(`${CONFIG.baseUrl}/problems/${CONFIG.problemSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.problem._id;
}

// ── Step 3: One complete user journey (submit → poll → result) ────────────────
async function simulateUser(userId, token, problemId) {
    const start = Date.now();
    const label = `[User ${userId}]`;

    try {
        // Submit code
        const submitRes = await axios.post(`${CONFIG.baseUrl}/submissions/submit`, {
            problemId,
            code: CONFIG.code,
            language_id: CONFIG.language,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const { jobId } = submitRes.data;
        if (!jobId) {
            return { userId, success: false, error: 'No jobId in response', ms: Date.now() - start };
        }

        // Poll for result
        const deadline = Date.now() + CONFIG.pollTimeoutMs;
        let polls = 0;
        while (Date.now() < deadline) {
            await sleep(CONFIG.pollIntervalMs);
            polls++;
            const pollRes = await axios.get(`${CONFIG.baseUrl}/submissions/result/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { status, verdict, passedTestCases, totalTestCases } = pollRes.data;

            if (status === 'done') {
                const ms = Date.now() - start;
                const passed = verdict === 'Accepted';
                console.log(`${label} ✅ Done in ${ms}ms — ${verdict} (${passedTestCases}/${totalTestCases}) after ${polls} polls`);
                return { userId, success: true, passed, verdict, ms, polls };
            }

            if (status === 'error') {
                const ms = Date.now() - start;
                console.log(`${label} ❌ Error: ${pollRes.data.error}`);
                return { userId, success: false, error: pollRes.data.error, ms, polls };
            }
        }

        // Timed out
        const ms = Date.now() - start;
        console.log(`${label} ⏱  Timed out after ${ms}ms (${polls} polls)`);
        return { userId, success: false, error: 'Timeout', ms, polls };

    } catch (err) {
        const ms = Date.now() - start;
        const message = err.response?.data?.message || err.message;
        console.log(`${label} 💥 Exception: ${message}`);
        return { userId, success: false, error: message, ms };
    }
}

// ── Step 4: Run load test ─────────────────────────────────────────────────────
async function runLoadTest() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  AI Placement System — Load Test`);
    console.log(`  Concurrent users : ${CONFIG.concurrentUsers}`);
    console.log(`  Backend URL      : ${CONFIG.baseUrl}`);
    console.log(`  Problem          : ${CONFIG.problemSlug}`);
    console.log(`  Language         : ${CONFIG.language}`);
    console.log(`${'═'.repeat(60)}\n`);

    // Login once and reuse token for all users (simulates pre-authenticated sessions)
    console.log('🔐 Logging in...');
    let token, problemId;
    try {
        token = await login();
        console.log('✅ Login successful\n');
        console.log('🔍 Fetching problem ID...');
        problemId = await getProblemId(token);
        console.log(`✅ Problem ID: ${problemId}\n`);
    } catch (err) {
        console.error('❌ Setup failed:', err.response?.data || err.message);
        process.exit(1);
    }

    const wallStart = Date.now();
    console.log(`🚀 Firing ${CONFIG.concurrentUsers} concurrent submissions at ${new Date().toISOString()}\n`);

    // Fire all users simultaneously
    const promises = Array.from({ length: CONFIG.concurrentUsers }, (_, i) =>
        simulateUser(i + 1, token, problemId)
    );

    const results = await Promise.all(promises);
    const wallTime = ((Date.now() - wallStart) / 1000).toFixed(1);

    // ── Report ──────────────────────────────────────────────────────────────────
    const succeeded = results.filter(r => r.success);
    const accepted = results.filter(r => r.verdict === 'Accepted');
    const failed = results.filter(r => !r.success);
    const timedOut = results.filter(r => r.error === 'Timeout');
    const times = succeeded.map(r => r.ms);
    const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const minMs = times.length ? Math.min(...times) : 0;
    const maxMs = times.length ? Math.max(...times) : 0;
    const p95Ms = times.length ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0;

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  LOAD TEST RESULTS');
    console.log(`${'═'.repeat(60)}`);
    console.log(`  Total users         : ${CONFIG.concurrentUsers}`);
    console.log(`  Wall-clock time     : ${wallTime}s`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Completed           : ${succeeded.length} / ${CONFIG.concurrentUsers}`);
    console.log(`  Accepted (correct)  : ${accepted.length} / ${CONFIG.concurrentUsers}`);
    console.log(`  Failed              : ${failed.length}`);
    console.log(`  Timed out (>90s)    : ${timedOut.length}`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Latency (end-to-end submission → result):`);
    console.log(`    Min    : ${minMs}ms`);
    console.log(`    Avg    : ${avgMs}ms`);
    console.log(`    P95    : ${p95Ms}ms`);
    console.log(`    Max    : ${maxMs}ms`);
    console.log(`${'═'.repeat(60)}\n`);

    if (failed.length > 0) {
        console.log('❌ Failures:');
        failed.forEach(r => console.log(`   User ${r.userId}: ${r.error}`));
        console.log();
    }

    const successRate = ((succeeded.length / CONFIG.concurrentUsers) * 100).toFixed(1);
    if (parseFloat(successRate) >= 95) {
        console.log(`✅ PASS — ${successRate}% success rate. Ready for AWS!\n`);
    } else if (parseFloat(successRate) >= 80) {
        console.log(`⚠️  MARGINAL — ${successRate}% success rate. Investigate failures before AWS.\n`);
    } else {
        console.log(`❌ FAIL — ${successRate}% success rate. Not ready for AWS.\n`);
    }
}

runLoadTest().catch(console.error);
