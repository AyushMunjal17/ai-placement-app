const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/User');

function buildProblemTestCases(problem, includeHidden = true) {
  const sampleCases = (problem.sampleTestCases || []).map((testCase) => ({
    input: testCase.isFileBased ? testCase.inputFile : testCase.input,
    expectedOutput: testCase.isFileBased ? testCase.outputFile : testCase.expectedOutput,
    hidden: false,
  }));

  const hiddenCases = includeHidden
    ? (problem.hiddenTestCases || []).map((testCase) => ({
      input: testCase.isFileBased ? testCase.inputFile : testCase.input,
      expectedOutput: testCase.isFileBased ? testCase.outputFile : testCase.expectedOutput,
      hidden: true,
    }))
    : [];

  return [...sampleCases, ...hiddenCases];
}

function splitIntoChunks(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push({
      offset: index,
      items: items.slice(index, index + size),
    });
  }
  return chunks;
}

function truncate(value, maxLength = 200) {
  const text = String(value || '');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function classifyRuntimeError(stderr = '') {
  if (stderr.includes('Memory Limit Exceeded')) {
    return 'Memory Limit Exceeded';
  }
  if (stderr.includes('Time Limit Exceeded')) {
    return 'Time Limit Exceeded';
  }
  return 'Runtime Error';
}

function evaluateExecutionResults(cases, executionResults, offset = 0) {
  let passedCount = 0;
  const results = [];

  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    const execution = executionResults[index] || {};
    const expectedOutput = String(testCase.expectedOutput || '').trim();
    const actualOutput = String(execution.stdout || '').trim();

    let status = 'Wrong Answer';
    let passed = false;
    let error = null;

    if (execution.compile_output) {
      status = 'Compilation Error';
      error = truncate(execution.compile_output, 400);
    } else if (execution.stderr) {
      status = classifyRuntimeError(execution.stderr);
      error = truncate(execution.stderr, 400);
    } else if (actualOutput === expectedOutput) {
      status = 'Passed';
      passed = true;
      passedCount += 1;
    } else {
      error = `Expected: ${truncate(expectedOutput)}, Got: ${truncate(actualOutput)}`;
    }

    results.push({
      testCaseNumber: offset + index + 1,
      type: testCase.hidden ? 'hidden' : 'sample',
      input: testCase.hidden ? 'Hidden' : truncate(testCase.input),
      expectedOutput: testCase.hidden ? 'Hidden' : truncate(expectedOutput),
      actualOutput: testCase.hidden ? 'Hidden' : truncate(actualOutput),
      passed,
      status,
      error,
      time: execution.durationMs || null,
      memory: execution.memoryUsedMb || null,
    });
  }

  return { passedCount, results };
}

function deriveVerdict(results) {
  if (!results.length) {
    return 'Internal Error';
  }

  if (results.every((result) => result.passed)) {
    return 'Accepted';
  }

  const priority = [
    'Compilation Error',
    'Memory Limit Exceeded',
    'Time Limit Exceeded',
    'Runtime Error',
    'Wrong Answer',
  ];

  for (const status of priority) {
    if (results.some((result) => result.status === status)) {
      return status;
    }
  }

  return 'Wrong Answer';
}

async function persistSubmissionQueued(submissionId, userId, problemId) {
  await Promise.all([
    User.findByIdAndUpdate(userId, { $inc: { totalSubmissions: 1 } }),
    Problem.findByIdAndUpdate(problemId, { $inc: { totalSubmissions: 1 } }),
    Submission.findByIdAndUpdate(submissionId, { status: 'In Queue' }),
  ]);
}

async function finalizeSubmission({ submissionId, userId, problemId, results, executionMs }) {
  const verdict = deriveVerdict(results);
  const passedTestCases = results.filter((result) => result.passed).length;
  const totalTestCases = results.length;
  const firstFailure = results.find((result) => !result.passed) || null;

  const update = {
    status: verdict,
    passedTestCases,
    totalTestCases,
    executionTime: executionMs,
    memoryUsed: firstFailure?.memory || null,
    testCaseResults: results.map((result) => ({
      testCaseIndex: result.testCaseNumber,
      status: result.status,
      executionTime: result.time,
      memoryUsed: result.memory,
      input: result.input,
      expectedOutput: result.expectedOutput,
      actualOutput: result.actualOutput,
      errorMessage: result.error,
    })),
    compileOutput: verdict === 'Compilation Error' ? firstFailure?.error || '' : '',
    stderr: verdict !== 'Accepted' && verdict !== 'Wrong Answer' ? firstFailure?.error || '' : '',
    score: totalTestCases ? Math.round((passedTestCases / totalTestCases) * 100) : 0,
  };

  await Submission.findByIdAndUpdate(submissionId, update);

  if (verdict === 'Accepted') {
    const hasPrevAccepted = await Submission.exists({
      userId,
      problemId,
      status: 'Accepted',
      _id: { $ne: submissionId },
    });

    const userUpdate = { $inc: {} };
    if (!hasPrevAccepted) {
      userUpdate.$inc.problemsSolved = 1;
    }
    if (Object.keys(userUpdate.$inc).length) {
      await User.findByIdAndUpdate(userId, userUpdate);
    }

    await Problem.findByIdAndUpdate(problemId, { $inc: { acceptedSubmissions: 1 } });
  }

  return {
    status: 'done',
    verdict,
    totalTestCases,
    passedTestCases,
    testResults: results,
    submissionId,
    executionMs,
  };
}

async function finalizeSubmissionError({ submissionId, verdict, message, executionMs = null }) {
  await Submission.findByIdAndUpdate(submissionId, {
    status: verdict,
    executionTime: executionMs,
    compileOutput: verdict === 'Compilation Error' ? message : '',
    stderr: verdict !== 'Compilation Error' ? message : '',
    score: 0,
  });

  return {
    status: verdict === 'Internal Error' ? 'error' : 'done',
    verdict,
    totalTestCases: 0,
    passedTestCases: 0,
    testResults: [],
    submissionId,
    error: message,
    executionMs,
  };
}

module.exports = {
  buildProblemTestCases,
  evaluateExecutionResults,
  finalizeSubmission,
  finalizeSubmissionError,
  persistSubmissionQueued,
  splitIntoChunks,
};
