const express = require('express');
const mongoose = require('mongoose');
const Submission = require('../../models/Submission');
const Problem = require('../../models/Problem');
const { authenticateToken } = require('../../middlewares/auth');
const { createUserRateLimiter } = require('../../middlewares/rateLimit');
const { config } = require('../../config');
const { compileQueue } = require('../../queue/compileQueue');
const { compileSubmission, runArtifactBatch } = require('../../lib/executorClient');
const { getStoredJobResult } = require('../../services/resultStore');
const {
  buildProblemTestCases,
  evaluateExecutionResults,
} = require('../../services/submissionPipeline');
const { submissionJobsTotal } = require('../../lib/metrics');
const { getCachedProblemMeta, setCachedProblemMeta } = require('../../lib/problemCache');
const { createLogger } = require('../../../shared/logger');

const router = express.Router();
const logger = createLogger('backend.routes.submissions');

const submitLimiter = createUserRateLimiter({
  prefix: 'submit',
  limit: config.submissionRateLimit,
  windowSec: config.submissionRateWindowSec,
});

const runLimiter = createUserRateLimiter({
  prefix: 'run',
  limit: config.runRateLimit,
  windowSec: config.runRateWindowSec,
});

function languageName(language) {
  return String(language || '').toLowerCase();
}

function runtimeStatus(result) {
  if (result.compile_output) {
    return 'Compilation Error';
  }
  if (result.stderr) {
    if (result.stderr.includes('Memory Limit Exceeded')) {
      return 'Memory Limit Exceeded';
    }
    if (result.stderr.includes('Time Limit Exceeded')) {
      return 'Time Limit Exceeded';
    }
    return 'Runtime Error';
  }
  return 'Accepted';
}

async function loadProblem(problemId) {
  return Problem.findById(problemId).lean();
}

async function loadProblemMeta(problemId) {
  const cached = getCachedProblemMeta(problemId);
  if (cached) {
    return cached;
  }

  const meta = await Problem.findById(problemId)
    .select('_id title supportedLanguages')
    .lean();
  if (meta) {
    setCachedProblemMeta(problemId, meta);
  }
  return meta;
}

async function ensureJobOwnership(jobId, userId) {
  const stored = await getStoredJobResult(jobId);
  if (stored) {
    return String(stored.userId) === String(userId) ? stored : null;
  }

  const job = await compileQueue.getJob(jobId);
  if (!job || String(job.data?.userId) !== String(userId)) {
    return null;
  }

  return { job };
}

router.post('/run', authenticateToken, runLimiter, async (req, res) => {
  if (!config.enableRunEndpoint) {
    return res.status(404).json({
      message: 'Route not found',
    });
  }

  try {
    const { code, language_id: languageId, problemId, stdin = '' } = req.body;
    const language = languageName(languageId);

    if (!code || !language) {
      return res.status(400).json({
        message: 'Code and language_id are required',
        error: 'MISSING_FIELDS',
      });
    }

    let problem = null;
    let inputs = [stdin];
    let evaluationCases = null;
    let timeLimitMs = 2000;
    let memoryLimitMb = 256;

    if (problemId) {
      problem = await loadProblem(problemId);
      if (!problem) {
        return res.status(404).json({
          message: 'Problem not found',
          error: 'PROBLEM_NOT_FOUND',
        });
      }

      if (Array.isArray(problem.supportedLanguages) && !problem.supportedLanguages.includes(language)) {
        return res.status(400).json({
          message: 'Language not supported for this problem',
          error: 'UNSUPPORTED_LANGUAGE',
        });
      }

      evaluationCases = buildProblemTestCases(problem, false);
      inputs = evaluationCases.map((item) => item.input);
      timeLimitMs = Math.max(500, Math.ceil((problem.timeLimit || 2) * 1000));
      memoryLimitMb = Math.max(64, problem.memoryLimit || 256);
    }

    const compileResult = await compileSubmission({
      language,
      code,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    if (compileResult.compile_output) {
      if (problemId) {
        return res.json({
          verdict: 'Compilation Error',
          totalTestCases: evaluationCases.length,
          passedTestCases: 0,
          testResults: evaluationCases.map((item, index) => ({
            testCaseNumber: index + 1,
            input: item.input,
            expectedOutput: item.expectedOutput,
            actualOutput: '',
            passed: false,
            status: 'Compilation Error',
            error: compileResult.compile_output,
            time: null,
            memory: null,
          })),
        });
      }

      return res.json({
        output: `Compilation Error:\n${compileResult.compile_output}`,
        status: 'Compilation Error',
        time: null,
        memory: null,
      });
    }

    const runResult = await runArtifactBatch({
      artifactId: compileResult.artifactId,
      language,
      inputs,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    if (problemId) {
      const evaluation = evaluateExecutionResults(evaluationCases, runResult.results || [], 0);
      return res.json({
        verdict: evaluation.results.every((item) => item.passed) ? 'Accepted' : 'Failed',
        totalTestCases: evaluation.results.length,
        passedTestCases: evaluation.passedCount,
        testResults: evaluation.results,
      });
    }

    const result = runResult.results?.[0] || {};
    const status = runtimeStatus(result);
    const output = result.compile_output
      ? `Compilation Error:\n${result.compile_output}`
      : result.stderr
        ? `${status}:\n${result.stderr}`
        : (result.stdout || 'No output');

    return res.json({
      output,
      status,
      time: result.durationMs || null,
      memory: result.memoryUsedMb || null,
    });
  } catch (error) {
    logger.error('Run request failed', { error, traceId: req.traceId });
    return res.status(error.statusCode || 500).json({
      message: 'Failed to execute code',
      error: error.message,
      traceId: req.traceId,
    });
  }
});

router.get('/result/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const owned = await ensureJobOwnership(jobId, req.user._id);
    if (!owned) {
      return res.status(404).json({
        message: 'Job not found',
        error: 'JOB_NOT_FOUND',
      });
    }

    if (owned.payload) {
      return res.json(owned.payload);
    }

    const state = await owned.job.getState();
    if (state === 'completed') {
      return res.json(owned.job.returnvalue);
    }

    if (state === 'failed') {
      return res.json({
        status: 'error',
        error: owned.job.failedReason || 'Execution failed',
        submissionId: owned.job.data?.submissionId,
      });
    }

    return res.json({
      status: 'processing',
      state,
      message: 'Your submission is being processed.',
    });
  } catch (error) {
    logger.error('Result lookup failed', { error, traceId: req.traceId });
    return res.status(500).json({
      message: 'Failed to fetch result',
      error: error.message,
      traceId: req.traceId,
    });
  }
});

router.post('/submit', authenticateToken, submitLimiter, async (req, res) => {
  try {
    const { problemId, code, language_id: languageId } = req.body;
    const language = languageName(languageId);

    if (!problemId || !code || !language) {
      return res.status(400).json({
        message: 'Problem ID, code, and language_id are required',
        error: 'MISSING_FIELDS',
      });
    }

    // FAST PATH: do not touch MongoDB here.
    // Worker will validate problem + language and persist the submission.
    if (!mongoose.isValidObjectId(problemId)) {
      return res.status(400).json({
        message: 'Invalid problemId',
        error: 'INVALID_PROBLEM_ID',
      });
    }

    const problem = await loadProblemMeta(problemId);
    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'PROBLEM_NOT_FOUND',
      });
    }

    if (Array.isArray(problem.supportedLanguages) && !problem.supportedLanguages.includes(language)) {
      return res.status(400).json({
        message: 'Language not supported for this problem',
        error: 'UNSUPPORTED_LANGUAGE',
      });
    }

    const submissionId = new mongoose.Types.ObjectId();

    // Keep the API path minimal: enqueue + return 202.
    const priority = 3;

    let job;
    try {
      job = await compileQueue.add('compile-submission', {
        problemId,
        code,
        language_id: language,
        userId: req.user._id.toString(),
        username: req.user.username,
        submissionId: submissionId.toString(),
        traceId: req.traceId,
      }, {
        priority,
        jobId: submissionId.toString(),
      });
    } catch (queueError) {
      throw queueError;
    }

    submissionJobsTotal.inc({ stage: 'queue', status: 'accepted' });
    return res.status(202).json({
      jobId: job.id,
      submissionId,
      status: 'queued',
      message: 'Submission accepted for asynchronous processing.',
    });
  } catch (error) {
    logger.error('Submit request failed', { error, traceId: req.traceId });
    return res.status(500).json({
      message: 'Failed to queue submission',
      error: error.message,
      traceId: req.traceId,
    });
  }
});

router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ submissions });
  } catch (error) {
    logger.error('Failed to list user submissions', { error, traceId: req.traceId });
    return res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

router.get('/user/my-submissions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, problemId } = req.query;
    const query = { userId: req.user._id };
    if (problemId) {
      query.problemId = problemId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const submissions = await Submission.find(query)
      .populate('problemId', 'title difficulty')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const totalSubmissions = await Submission.countDocuments(query);

    return res.json({
      message: 'User submissions retrieved successfully',
      submissions: submissions.map((submission) => submission.getPublicData()),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalSubmissions / Number(limit)),
        totalSubmissions,
        hasNext: Number(page) * Number(limit) < totalSubmissions,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    logger.error('Failed to paginate user submissions', { error, traceId: req.traceId });
    return res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

router.get('/problem/:problemId', authenticateToken, async (req, res) => {
  try {
    const submissions = await Submission.find({
      userId: req.user._id,
      problemId: req.params.problemId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ submissions });
  } catch (error) {
    logger.error('Failed to fetch problem submissions', { error, traceId: req.traceId });
    return res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problemId', 'title difficulty')
      .populate('userId', 'username firstName lastName');

    if (!submission) {
      return res.status(404).json({
        message: 'Submission not found',
        error: 'SUBMISSION_NOT_FOUND',
      });
    }

    if (String(submission.userId._id) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        error: 'ACCESS_DENIED',
      });
    }

    return res.json({
      message: 'Submission retrieved successfully',
      submission,
    });
  } catch (error) {
    logger.error('Failed to fetch submission', { error, traceId: req.traceId });
    return res.status(500).json({ message: 'Failed to fetch submission', error: error.message });
  }
});

module.exports = router;
