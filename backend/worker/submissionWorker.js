const { Worker } = require('bullmq');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { config } = require('../config');
const { bullConnection } = require('../lib/redis');
const { compileSubmission, runArtifactBatch } = require('../lib/executorClient');
const { createLogger } = require('../../shared/logger');
const { executionQueue, executionQueueEvents } = require('../queue/executionQueue');
const { compileQueue } = require('../queue/compileQueue');
const {
  buildProblemTestCases,
  evaluateExecutionResults,
  finalizeSubmission,
  finalizeSubmissionError,
  splitIntoChunks,
} = require('../services/submissionPipeline');
const { storeJobResult } = require('../services/resultStore');
const { publishSubmissionResult } = require('../lib/socket');
const { submissionJobsTotal, workerActiveJobs } = require('../lib/metrics');

const logger = createLogger('backend.worker');
let workers = null;

function jobPriority(job) {
  return job.opts?.priority || 3;
}

async function processCompileJob(job) {
  const startedAt = Date.now();
  const { problemId, code, language_id: language, userId, submissionId, traceId } = job.data;

  try {
    const problem = await Problem.findById(problemId).lean();
    const problemTitle = problem?.title || 'Unknown Problem';

    // Ensure the submission record exists (API is enqueue-only).
    await Submission.updateOne(
      { _id: submissionId },
      {
        $setOnInsert: {
          _id: submissionId,
          userId,
          username: job.data?.username || 'unknown',
          problemId,
          problemTitle,
          code,
          language,
          submissionTime: new Date(),
        },
        $set: { status: 'Processing' },
      },
      { upsert: true }
    );

    if (!problem) {
      const payload = await finalizeSubmissionError({
        submissionId,
        verdict: 'Internal Error',
        message: 'Problem not found',
        executionMs: Date.now() - startedAt,
      });
      await storeJobResult(job.id, userId, payload);
      await publishSubmissionResult({ jobId: job.id, userId, payload });
      submissionJobsTotal.inc({ stage: 'compile', status: 'missing_problem' });
      return payload;
    }

    if (Array.isArray(problem.supportedLanguages) && !problem.supportedLanguages.includes(language)) {
      const payload = await finalizeSubmissionError({
        submissionId,
        verdict: 'Internal Error',
        message: 'Language not supported for this problem',
        executionMs: Date.now() - startedAt,
      });
      await storeJobResult(job.id, userId, payload);
      await publishSubmissionResult({ jobId: job.id, userId, payload });
      submissionJobsTotal.inc({ stage: 'compile', status: 'unsupported_language' });
      return payload;
    }

    const timeLimitMs = Math.max(500, Math.ceil((problem.timeLimit || 2) * 1000));
    const memoryLimitMb = Math.max(64, problem.memoryLimit || 256);
    const allTestCases = buildProblemTestCases(problem, true);

    const compileResult = await compileSubmission({
      language,
      code,
      timeLimitMs,
      memoryLimitMb,
      traceId,
    });

    if (compileResult.compile_output) {
      const payload = await finalizeSubmissionError({
        submissionId,
        verdict: 'Compilation Error',
        message: compileResult.compile_output,
        executionMs: Date.now() - startedAt,
      });
      await storeJobResult(job.id, userId, payload);
      await publishSubmissionResult({ jobId: job.id, userId, payload });
      submissionJobsTotal.inc({ stage: 'compile', status: 'compilation_error' });
      return payload;
    }

    const chunks = splitIntoChunks(allTestCases, config.executionChunkSize);
    const childJobs = await Promise.all(chunks.map(({ items, offset }, index) => executionQueue.add('execute-chunk', {
      submissionJobId: job.id,
      submissionId,
      userId,
      problemId,
      artifactId: compileResult.artifactId,
      language,
      timeLimitMs,
      memoryLimitMb,
      traceId,
      offset,
      chunkIndex: index,
      cases: items,
      inputs: items.map((item) => item.input),
    }, {
      priority: jobPriority(job),
    })));

    const chunkResults = await Promise.all(childJobs.map((childJob) => childJob.waitUntilFinished(executionQueueEvents)));
    const results = chunkResults
      .flatMap((chunk) => chunk.results)
      .sort((left, right) => left.testCaseNumber - right.testCaseNumber);

    const payload = await finalizeSubmission({
      submissionId,
      userId,
      problemId,
      results,
      executionMs: Date.now() - startedAt,
    });

    await storeJobResult(job.id, userId, payload);
    await publishSubmissionResult({ jobId: job.id, userId, payload });
    submissionJobsTotal.inc({ stage: 'compile', status: payload.verdict });
    logger.info('Submission completed', {
      traceId,
      jobId: job.id,
      submissionId,
      verdict: payload.verdict,
      totalTestCases: payload.totalTestCases,
      passedTestCases: payload.passedTestCases,
    });
    return payload;
  } catch (error) {
    logger.error('Compile worker failed', { error, traceId, jobId: job.id, submissionId });
    const payload = await finalizeSubmissionError({
      submissionId,
      verdict: 'Internal Error',
      message: error.message,
      executionMs: Date.now() - startedAt,
    });
    await storeJobResult(job.id, userId, payload);
    await publishSubmissionResult({ jobId: job.id, userId, payload });
    submissionJobsTotal.inc({ stage: 'compile', status: 'internal_error' });
    return payload;
  }
}

async function processExecutionJob(job) {
  const { artifactId, language, inputs, cases, timeLimitMs, memoryLimitMb, offset, traceId } = job.data;

  const execution = await runArtifactBatch({
    artifactId,
    language,
    inputs,
    timeLimitMs,
    memoryLimitMb,
    traceId,
  });

  return evaluateExecutionResults(cases, execution.results || [], offset);
}

function bindWorkerMetrics(worker, queueName) {
  worker.on('active', () => {
    workerActiveJobs.inc({ queue: queueName }, 1);
  });

  const decrement = () => {
    workerActiveJobs.dec({ queue: queueName }, 1);
  };

  worker.on('completed', decrement);
  worker.on('failed', decrement);
  worker.on('error', (error) => {
    logger.error('BullMQ worker error', { queue: queueName, error });
  });
}

async function startSubmissionWorkers() {
  if (workers) {
    return workers;
  }

  await executionQueueEvents.waitUntilReady();

  const compileWorker = new Worker('compile-queue', processCompileJob, {
    connection: bullConnection,
    concurrency: config.compileQueueConcurrency,
    lockDuration: 300000,
  });

  const executionWorker = new Worker('execution-queue', processExecutionJob, {
    connection: bullConnection,
    concurrency: config.executionQueueConcurrency,
    lockDuration: 300000,
  });

  bindWorkerMetrics(compileWorker, 'compile');
  bindWorkerMetrics(executionWorker, 'execution');

  workers = { compileWorker, executionWorker };
  logger.info('Submission workers started', {
    compileConcurrency: config.compileQueueConcurrency,
    executionConcurrency: config.executionQueueConcurrency,
  });
  return workers;
}

async function stopSubmissionWorkers() {
  if (!workers) {
    return;
  }

  await Promise.allSettled([
    workers.compileWorker.close(),
    workers.executionWorker.close(),
  ]);
  workers = null;
}

module.exports = { startSubmissionWorkers, stopSubmissionWorkers };
