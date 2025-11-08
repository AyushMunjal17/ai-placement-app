const express = require('express');
const axios = require('axios');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Language mapping for Piston API
const LANGUAGE_MAP = {
  'c': 'c',
  'cpp': 'c++',
  'java': 'java',
  'python': 'python',
  'javascript': 'javascript'
};

// Piston API configuration
const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

console.log('🚀 Using Piston API:', PISTON_API_URL);

// @route   GET /api/submissions/test-piston
// @desc    Test Piston API
// @access  Public (for debugging)
router.get('/test-piston', async (req, res) => {
  try {
    const response = await axios.post(`${PISTON_API_URL}/execute`, {
      language: 'python',
      version: '3.10.0',
      files: [{
        content: 'print("Hello from Piston!")'
      }]
    });

    res.json({
      message: 'Piston API test successful',
      output: response.data.run.output,
      status: 'Working ✅'
    });
  } catch (error) {
    console.error('Piston test error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Simple Judge0 test failed',
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

// Helper function to execute code using Piston API
const executeCode = async (code, languageId, stdin = '') => {
  try {
    console.log('🚀 Executing code with Piston API...');
    console.log('📝 Code length:', code.length);
    console.log('🔢 Language:', languageId);
    console.log('📥 Input length:', stdin.length);

    // Map language ID to Piston language name
    const language = LANGUAGE_MAP[languageId] || languageId;

    // Execute code with Piston
    const response = await axios.post(`${PISTON_API_URL}/execute`, {
      language: language,
      version: '*', // Use latest version
      files: [{
        content: code
      }],
      stdin: stdin || '',
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1
    });

    console.log('✅ Execution completed');
    const result = response.data;

    // Map Piston response to our format
    const mappedResult = {
      stdout: result.run?.output || '',
      stderr: result.run?.stderr || result.compile?.stderr || '',
      compile_output: result.compile?.output || '',
      status: {
        id: result.run?.code === 0 ? 3 : 4, // 3 = Accepted, 4 = Wrong Answer
        description: result.run?.code === 0 ? 'Accepted' : (result.run?.signal || 'Runtime Error')
      },
      time: null, // Piston doesn't provide execution time
      memory: null // Piston doesn't provide memory usage
    };

    console.log('🔍 Execution result:');
    console.log('📤 stdout:', mappedResult.stdout);
    console.log('❌ stderr:', mappedResult.stderr);
    console.log('🔧 compile_output:', mappedResult.compile_output);
    console.log('📊 status:', mappedResult.status);

    return mappedResult;
  } catch (error) {
    console.error('❌ Piston execution error:', error.response?.data || error.message);
    throw new Error('Code execution failed: ' + (error.response?.data?.message || error.message));
  }
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

      // Run against sample test cases only
      const testResults = [];
      let allPassed = true;
      let totalPassed = 0;

      for (let i = 0; i < problem.sampleTestCases.length; i++) {
        const testCase = problem.sampleTestCases[i];
        const input = testCase.isFileBased ? testCase.inputFile : testCase.input;
        
        try {
          const result = await executeCode(code, language_id, input);
          
          let passed = false;
          let status = 'Failed';
          let error = null;
          let actualOutput = '';

          if (result.compile_output) {
            error = result.compile_output;
            status = 'Compilation Error';
          } else if (result.stderr) {
            error = result.stderr;
            status = 'Runtime Error';
          } else if (result.status.id === 3) { // Accepted
            actualOutput = result.stdout.trim();
            const expectedOutput = (testCase.isFileBased ? testCase.outputFile : testCase.expectedOutput).trim();
            passed = actualOutput === expectedOutput;
            
            if (passed) {
              status = 'Passed';
              totalPassed++;
            } else {
              status = 'Wrong Answer';
              allPassed = false;
            }
          } else {
            error = result.status.description;
            status = result.status.description;
            allPassed = false;
          }

          if (!passed) allPassed = false;

          testResults.push({
            testCaseNumber: i + 1,
            input: testCase.input.length > 100 ? testCase.input.substring(0, 100) + '...' : testCase.input,
            expectedOutput: testCase.expectedOutput.length > 100 ? testCase.expectedOutput.substring(0, 100) + '...' : testCase.expectedOutput,
            actualOutput: actualOutput.length > 100 ? actualOutput.substring(0, 100) + '...' : actualOutput,
            passed,
            status,
            error,
            time: result.time,
            memory: result.memory
          });
        } catch (error) {
          allPassed = false;
          testResults.push({
            testCaseNumber: i + 1,
            passed: false,
            status: 'Error',
            error: error.message
          });
        }
      }

      return res.json({
        verdict: allPassed ? 'Accepted' : 'Failed',
        totalTestCases: problem.sampleTestCases.length,
        passedTestCases: totalPassed,
        testResults
      });
    }

    // If no problemId, run with custom input (original behavior)
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

    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];
      
      try {
        const result = await executeCode(code, language_id, testCase.input);
        
        let passed = false;
        let error = null;

        if (result.compile_output) {
          error = 'Compilation Error: ' + result.compile_output;
        } else if (result.stderr) {
          error = 'Runtime Error: ' + result.stderr;
        } else if (result.status.id === 3) { // Accepted
          const actualOutput = result.stdout.trim();
          const expectedOutput = testCase.expectedOutput.trim();
          passed = actualOutput === expectedOutput;
          
          if (!passed) {
            error = `Expected: ${expectedOutput}, Got: ${actualOutput}`;
          }
        } else {
          error = result.status.description;
        }

        if (passed) passedCount++;

        results.push({
          testCaseNumber: i + 1,
          type: testCase.type,
          input: testCase.type === 'sample' ? (testCase.input.length > 100 ? testCase.input.substring(0, 100) + '...' : testCase.input) : 'Hidden',
          expectedOutput: testCase.type === 'sample' ? (testCase.expectedOutput.length > 100 ? testCase.expectedOutput.substring(0, 100) + '...' : testCase.expectedOutput) : 'Hidden',
          actualOutput: testCase.type === 'sample' && result.stdout ? (result.stdout.trim().length > 100 ? result.stdout.trim().substring(0, 100) + '...' : result.stdout.trim()) : 'Hidden',
          passed,
          status: passed ? 'Passed' : (error ? error.split(':')[0] : 'Failed'),
          error,
          time: result.time,
          memory: result.memory
        });

      } catch (err) {
        results.push({
          testCaseNumber: i + 1,
          type: testCase.type,
          input: testCase.type === 'sample' ? testCase.input : 'Hidden',
          expectedOutput: testCase.type === 'sample' ? testCase.expectedOutput : 'Hidden',
          actualOutput: 'Error',
          passed: false,
          status: 'Error',
          error: err.message,
          time: null,
          memory: null
        });
      }
    }

    // Create submission record
    const submission = new Submission({
      userId: req.user._id,
      username: req.user.username,
      problemId,
      problemTitle: problem.title,
      code,
      language: language_id, // Use language name directly (python, javascript, etc.)
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
