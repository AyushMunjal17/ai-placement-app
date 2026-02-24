const express = require('express');
const axios = require('axios');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Language mapping for Code Executor service
const LANGUAGE_MAP = {
  'c': 'c',
  'cpp': 'cpp',
  'java': 'java',
  'python': 'python',
  'javascript': 'javascript'
};

// Code Executor microservice URL (self-hosted on Render)
const CODE_EXECUTOR_URL = process.env.CODE_EXECUTOR_URL || 'http://localhost:8080';

console.log('🚀 Using Code Executor:', CODE_EXECUTOR_URL);

// @route   GET /api/submissions/test-executor
// @desc    Test Code Executor service
// @access  Public (for debugging)
router.get('/test-executor', async (req, res) => {
  try {
    const response = await axios.post(`${CODE_EXECUTOR_URL}/execute`, {
      language: 'python',
      code: 'print("Hello from Code Executor!")',
      stdin: ''
    });

    res.json({
      message: 'Code Executor test successful',
      output: response.data.stdout,
      status: 'Working ✅'
    });
  } catch (error) {
    console.error('Executor test error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Code Executor test failed',
      error: error.response?.data || error.message
    });
  }
});

// @route   GET /api/submissions/test-judge0
// @desc    Test Judge0 API connection
// @access  Private
router.get('/test-judge0', authenticateToken, async (req, res) => {
  try {
    if (!JUDGE0_API_KEY) {
      return res.status(500).json({
        message: 'Judge0 API key not configured',
        error: 'MISSING_API_KEY'
      });
    }

    // Test with a simple "Hello World" program
    const testCode = 'print("Hello from Judge0!")';

    const submissionResponse = await axios.post(`${JUDGE0_API_URL}/submissions`, {
      source_code: Buffer.from(testCode).toString('base64'),
      language_id: 71, // Python
      stdin: Buffer.from('').toString('base64')
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      }
    });

    const token = submissionResponse.data.token;

    // Wait a bit and get result
    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultResponse = await axios.get(`${JUDGE0_API_URL}/submissions/${token}`, {
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      }
    });

    res.json({
      message: 'Judge0 API test successful!',
      token,
      result: resultResponse.data,
      apiKey: JUDGE0_API_KEY ? 'Configured' : 'Missing'
    });

  } catch (error) {
    console.error('Judge0 test error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Judge0 API test failed',
      error: error.response?.data || error.message,
      apiKey: JUDGE0_API_KEY ? 'Configured' : 'Missing'
    });
  }
});

// Helper function to execute code using self-hosted Code Executor
const executeCode = async (code, languageId, stdin = '') => {
  try {
    console.log('🚀 Executing code with Code Executor...');
    console.log('📝 Code length:', code.length);
    console.log('🔢 Language:', languageId);
    console.log('📥 Input length:', stdin.length);

    // Map language ID to executor language name
    const language = LANGUAGE_MAP[languageId] || languageId;

    // Execute code with our self-hosted executor
    const response = await axios.post(`${CODE_EXECUTOR_URL}/execute`, {
      language: language,
      code: code,
      stdin: stdin || ''
    }, {
      timeout: 15000 // 15 second HTTP timeout
    });

    console.log('✅ Execution completed');
    const result = response.data;

    // Map response to our internal format
    const mappedResult = {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      status: {
        id: result.exitCode === 0 ? 3 : 4, // 3 = Accepted, 4 = Error
        description: result.exitCode === 0 ? 'Accepted' : 'Runtime Error'
      },
      time: null,
      memory: null
    };

    console.log('🔍 Execution result:');
    console.log('📤 stdout:', mappedResult.stdout);
    console.log('❌ stderr:', mappedResult.stderr);
    console.log('🔧 compile_output:', mappedResult.compile_output);
    console.log('📊 status:', mappedResult.status);

    return mappedResult;
  } catch (error) {
    console.error('❌ Code Executor error:', error.response?.data || error.message);
    throw new Error('Code execution failed: ' + (error.response?.data?.error || error.message));
  }
};

// Helper: compile once, run once per test case (batch endpoint)
// Returns an array of mapped results — one per input string.
// Compile errors are propagated to every result entry.
const executeCodeBatch = async (code, languageId, inputs = []) => {
  const language = LANGUAGE_MAP[languageId] || languageId;
  console.log(`🚀 Batch execute: ${inputs.length} test cases, language=${language}`);

  const response = await axios.post(`${CODE_EXECUTOR_URL}/batch`, {
    language,
    code,
    inputs
  }, {
    // Each run gets 10s + 5s overhead per test case, capped at 120s
    timeout: Math.min(120000, 15000 + inputs.length * 10000)
  });

  const { results } = response.data;
  // Map each raw result to the same shape executeCode() returns
  return results.map(r => ({
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    compile_output: r.compile_output || '',
    status: {
      id: r.exitCode === 0 ? 3 : 4,
      description: r.exitCode === 0 ? 'Accepted' : 'Runtime Error'
    },
    time: null,
    memory: null
  }));
};

// @route   POST /api/submissions/run
// @desc    Run code with sample test cases validation
// @access  Private
router.post('/run', authenticateToken, async (req, res) => {
  try {
    const { code, language_id, problemId, stdin = '' } = req.body;

    if (!code || !language_id) {
      return res.status(400).json({
        message: 'Code and language_id are required',
        error: 'MISSING_FIELDS'
      });
    }

    // If problemId is provided, run against sample test cases
    if (problemId) {
      const problem = await Problem.findById(problemId);
      if (!problem) {
        return res.status(404).json({
          message: 'Problem not found',
          error: 'PROBLEM_NOT_FOUND'
        });
      }

      const sampleTestCases = problem.sampleTestCases;
      const testResults = [];
      let allPassed = true;
      let totalPassed = 0;

      // Compile once, run once per test case via /batch
      // Each test case gets its own isolated stdin/stdout — no mixing.
      const inputs = sampleTestCases.map(tc => tc.isFileBased ? tc.inputFile : tc.input);
      const execResults = await executeCodeBatch(code, language_id, inputs);

      for (let i = 0; i < sampleTestCases.length; i++) {
        const tc = sampleTestCases[i];
        const result = execResults[i];
        const expectedOutput = (tc.isFileBased ? tc.outputFile : tc.expectedOutput).trim();

        let passed = false;
        let status = 'Failed';
        let error = null;
        let actualOutput = '';

        if (result.compile_output) {
          status = 'Compilation Error';
          error = result.compile_output;
          allPassed = false;
        } else if (result.stderr) {
          status = 'Runtime Error';
          error = result.stderr;
          allPassed = false;
        } else {
          actualOutput = result.stdout.trim();
          passed = actualOutput === expectedOutput;
          if (passed) {
            status = 'Passed';
            totalPassed++;
          } else {
            status = 'Wrong Answer';
            allPassed = false;
          }
        }

        testResults.push({
          testCaseNumber: i + 1,
          input: tc.input.length > 100 ? tc.input.substring(0, 100) + '...' : tc.input,
          expectedOutput: expectedOutput.length > 100 ? expectedOutput.substring(0, 100) + '...' : expectedOutput,
          actualOutput: actualOutput.length > 100 ? actualOutput.substring(0, 100) + '...' : actualOutput,
          passed,
          status,
          error,
          time: result.time,
          memory: result.memory
        });
      }

      return res.json({
        verdict: allPassed ? 'Accepted' : 'Failed',
        totalTestCases: sampleTestCases.length,
        passedTestCases: totalPassed,
        testResults
      });
    }

    // No problemId — run with custom stdin (original behaviour)
    const result = await executeCode(code, language_id, stdin);

    let output = '';
    if (result.compile_output) {
      output = 'Compilation Error:\n' + result.compile_output;
    } else if (result.stderr) {
      output = 'Runtime Error:\n' + result.stderr;
    } else if (result.stdout) {
      output = result.stdout;
    } else {
      output = 'No output';
    }

    res.json({
      output,
      status: result.status.description,
      time: result.time,
      memory: result.memory
    });

  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({
      message: 'Failed to execute code',
      error: error.message
    });
  }
});

// @route   POST /api/submissions/submit
// @desc    Submit solution and test against all test cases
// @access  Private
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { problemId, code, language_id } = req.body;

    if (!problemId || !code || !language_id) {
      return res.status(400).json({
        message: 'Problem ID, code, and language_id are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Get problem details
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'PROBLEM_NOT_FOUND'
      });
    }

    // Test against all test cases (sample + hidden)
    const allTestCases = [
      ...problem.sampleTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput, type: 'sample' })),
      ...problem.hiddenTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput, type: 'hidden' }))
    ];

    const results = [];
    let passedCount = 0;

    // Compile once, run once per test case via /batch
    // Each test case gets its own isolated stdin/stdout — no mixing.
    const inputs = allTestCases.map(tc => tc.input);
    const execResults = await executeCodeBatch(code, language_id, inputs);

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
        status = 'Runtime Error';
        error = 'Runtime Error: ' + result.stderr;
      } else {
        actualOutput = result.stdout.trim();
        passed = actualOutput === expectedOutput;
        status = passed ? 'Passed' : 'Wrong Answer';
        if (!passed) {
          error = `Expected: ${expectedOutput}, Got: ${actualOutput}`;
        }
      }

      if (passed) passedCount++;

      const displayActual = tc.type === 'sample'
        ? (actualOutput.length > 100 ? actualOutput.substring(0, 100) + '...' : actualOutput)
        : 'Hidden';

      results.push({
        testCaseNumber: i + 1,
        type: tc.type,
        input: tc.type === 'sample' ? (tc.input.length > 100 ? tc.input.substring(0, 100) + '...' : tc.input) : 'Hidden',
        expectedOutput: tc.type === 'sample' ? (expectedOutput.length > 100 ? expectedOutput.substring(0, 100) + '...' : expectedOutput) : 'Hidden',
        actualOutput: displayActual,
        passed,
        status,
        error,
        time: result.time,
        memory: result.memory
      });
    }

    // Create submission record
    const submission = new Submission({
      userId: req.user._id,
      username: req.user.username,
      problemId,
      problemTitle: problem.title,
      code,
      language: language_id,
      status: passedCount === allTestCases.length ? 'Accepted' : 'Wrong Answer',
      passedTestCases: passedCount,
      totalTestCases: allTestCases.length,
      executionTime: Math.max(...results.map(r => r.time || 0)),
      memoryUsed: Math.max(...results.map(r => r.memory || 0)),
      testCaseResults: results
    });

    await submission.save();

    // Update user and problem statistics
    if (passedCount === allTestCases.length) {
      // Check if this is the user's first successful submission for this problem
      const previousSuccess = await Submission.findOne({
        userId: req.user._id,
        problemId,
        status: 'Accepted',
        _id: { $ne: submission._id }
      });

      if (!previousSuccess) {
        req.user.problemsSolved += 1;
        await req.user.save();
      }
    }

    req.user.totalSubmissions += 1;
    await req.user.save();

    res.json({
      verdict: submission.status,
      totalTestCases: allTestCases.length,
      passedTestCases: passedCount,
      testResults: results,
      submissionId: submission._id
    });

  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({
      message: 'Failed to submit solution',
      error: error.message
    });
  }
});

// @route   GET /api/submissions/my-submissions
// @desc    Get all submissions for the logged-in user
// @access  Private
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const submissions = await Submission.find({
      userId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      submissions
    });

  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// @route   GET /api/submissions/problem/:problemId
// @desc    Get user's submissions for a specific problem
// @access  Private
router.get('/problem/:problemId', authenticateToken, async (req, res) => {
  try {
    const { problemId } = req.params;

    const submissions = await Submission.find({
      userId: req.user._id,
      problemId: problemId
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      submissions
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// @route   POST /api/submissions
// @desc    Submit code for execution
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { problemId, code, language } = req.body;

    // Validation
    if (!problemId || !code || !language) {
      return res.status(400).json({
        message: 'Problem ID, code, and language are required',
        error: 'MISSING_FIELDS'
      });
    }

    if (!LANGUAGE_IDS[language]) {
      return res.status(400).json({
        message: 'Unsupported programming language',
        error: 'UNSUPPORTED_LANGUAGE'
      });
    }

    // Get problem details
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'PROBLEM_NOT_FOUND'
      });
    }

    if (!problem.isPublic || !problem.isActive) {
      return res.status(403).json({
        message: 'Problem is not accessible',
        error: 'PROBLEM_NOT_ACCESSIBLE'
      });
    }

    // Check if Judge0 API is configured
    if (!process.env.JUDGE0_API_KEY || process.env.JUDGE0_API_KEY === 'your_judge0_api_key_here') {
      // For now, return a mock response since Judge0 is not configured
      const mockSubmission = new Submission({
        userId: req.user._id,
        username: req.user.username,
        problemId: problem._id,
        problemTitle: problem.title,
        code,
        language,
        status: 'Accepted', // Mock status
        executionTime: Math.floor(Math.random() * 1000) + 100, // Mock execution time
        memoryUsed: Math.floor(Math.random() * 50000) + 10000, // Mock memory usage
        totalTestCases: problem.sampleTestCases.length + problem.hiddenTestCases.length,
        passedTestCases: problem.sampleTestCases.length + problem.hiddenTestCases.length,
        score: 100
      });

      await mockSubmission.save();

      // Update user statistics
      req.user.totalSubmissions += 1;
      req.user.problemsSolved += 1;
      await req.user.save();

      // Update problem statistics
      problem.totalSubmissions += 1;
      problem.acceptedSubmissions += 1;
      await problem.save();

      return res.status(201).json({
        message: 'Code submitted successfully (Mock Response - Judge0 not configured)',
        submission: mockSubmission.getPublicData()
      });
    }

    // Create submission record
    const submission = new Submission({
      userId: req.user._id,
      username: req.user.username,
      problemId: problem._id,
      problemTitle: problem.title,
      code,
      language,
      status: 'Pending'
    });

    await submission.save();

    // Update user statistics
    req.user.totalSubmissions += 1;
    await req.user.save();

    // Update problem statistics
    problem.totalSubmissions += 1;
    await problem.save();

    // Prepare test cases for Judge0
    const allTestCases = [
      ...problem.sampleTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      ...problem.hiddenTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput }))
    ];

    // Submit to Judge0 (this will be implemented when Judge0 is configured)
    // For now, we'll return the submission with pending status
    res.status(201).json({
      message: 'Code submitted successfully',
      submission: submission.getPublicData(),
      note: 'Judge0 API not configured - submission is pending'
    });

  } catch (error) {
    console.error('Submit code error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid problem ID',
        error: 'INVALID_ID'
      });
    }

    res.status(500).json({
      message: 'Server error while submitting code',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/submissions/:id
// @desc    Get submission details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const submissionId = req.params.id;

    const submission = await Submission.findById(submissionId)
      .populate('problemId', 'title difficulty')
      .populate('userId', 'username firstName lastName');

    if (!submission) {
      return res.status(404).json({
        message: 'Submission not found',
        error: 'SUBMISSION_NOT_FOUND'
      });
    }

    // Check if user owns this submission or is admin
    if (submission.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'Submission retrieved successfully',
      submission
    });

  } catch (error) {
    console.error('Get submission error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid submission ID',
        error: 'INVALID_ID'
      });
    }

    res.status(500).json({
      message: 'Server error while fetching submission',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/submissions/user/my-submissions
// @desc    Get current user's submissions
// @access  Private
router.get('/user/my-submissions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, problemId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { userId: req.user._id };
    if (problemId) {
      query.problemId = problemId;
    }

    const submissions = await Submission.find(query)
      .populate('problemId', 'title difficulty')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSubmissions = await Submission.countDocuments(query);
    const totalPages = Math.ceil(totalSubmissions / parseInt(limit));

    res.json({
      message: 'User submissions retrieved successfully',
      submissions: submissions.map(sub => sub.getPublicData()),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSubmissions,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({
      message: 'Server error while fetching submissions',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/submissions/problem/:problemId
// @desc    Get submissions for a specific problem (for problem owner)
// @access  Private
router.get('/problem/:problemId', authenticateToken, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user owns the problem
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'PROBLEM_NOT_FOUND'
      });
    }

    if (problem.publishedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied - you can only view submissions for your own problems',
        error: 'ACCESS_DENIED'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await Submission.find({ problemId })
      .populate('userId', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSubmissions = await Submission.countDocuments({ problemId });
    const totalPages = Math.ceil(totalSubmissions / parseInt(limit));

    res.json({
      message: 'Problem submissions retrieved successfully',
      submissions: submissions.map(sub => sub.getPublicData()),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSubmissions,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get problem submissions error:', error);
    res.status(500).json({
      message: 'Server error while fetching problem submissions',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
