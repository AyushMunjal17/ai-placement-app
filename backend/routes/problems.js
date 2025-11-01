const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/adminAuth');

const router = express.Router();

// @route   GET /api/problems/debug/all
// @desc    Debug route to see all problems in database
// @access  Public (temporary for debugging)
router.get('/debug/all', async (req, res) => {
  try {
    // Check database connection info
    const dbName = mongoose.connection.db.databaseName;
    const connectionState = mongoose.connection.readyState;
    const host = mongoose.connection.host;
    
    console.log('🔍 Database Info:');
    console.log('📊 Database Name:', dbName);
    console.log('🔗 Connection State:', connectionState);
    console.log('🏠 Host:', host);
    
    const allProblems = await Problem.find({}).select('title isPublic isActive publishedBy createdAt');
    console.log('🔍 All problems in database:', allProblems);
    
    // Also check specifically for public/active problems
    const publicProblems = await Problem.find({ isPublic: true, isActive: true }).select('title isPublic isActive');
    console.log('🔍 Public & Active problems:', publicProblems);
    
    // Check all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📚 Collections in database:', collectionNames);
    
    res.json({
      message: 'All problems (debug)',
      databaseInfo: {
        name: dbName,
        host: host,
        connectionState: connectionState,
        collections: collectionNames
      },
      totalCount: allProblems.length,
      publicActiveCount: publicProblems.length,
      allProblems: allProblems,
      publicProblems: publicProblems
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/problems
// @desc    Get all public problems
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, tags, companyTags, search, page = 1, limit = 20 } = req.query;
    
    console.log('📋 Fetching problems with filters:', { difficulty, tags, companyTags, search });
    
    // Build query
    const query = { isPublic: true, isActive: true };
    console.log('🔍 Base query:', query);
    
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    if (companyTags) {
      const companyTagArray = companyTags.split(',').map(tag => tag.trim());
      query.companyTags = { $in: companyTagArray };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('🔍 Final query:', query);
    console.log('📄 Pagination:', { page, limit, skip });
    
    // Fetch problems
    const problems = await Problem.find(query)
      .populate('publishedBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProblems = await Problem.countDocuments(query);
    const totalPages = Math.ceil(totalProblems / parseInt(limit));
    
    console.log('📊 Results:', { totalProblems, problemsFound: problems.length });

    res.json({
      message: 'Problems retrieved successfully',
      problems: problems.map(problem => problem.getPublicData()),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProblems,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({
      message: 'Server error while fetching problems',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/problems/:id
// @desc    Get a specific problem by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const problemId = req.params.id;
    
    const problem = await Problem.findById(problemId)
      .populate('publishedBy', 'username firstName lastName');

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

    // Return problem without hidden test cases for public access
    const problemData = problem.getPublicData();

    res.json({
      message: 'Problem retrieved successfully',
      problem: problemData
    });

  } catch (error) {
    console.error('Get problem error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid problem ID',
        error: 'INVALID_ID'
      });
    }

    res.status(500).json({
      message: 'Server error while fetching problem',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/problems
// @desc    Create a new problem
// @access  Private (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      tags,
      companyTags,
      sampleTestCases,
      hiddenTestCases,
      timeLimit,
      memoryLimit,
      supportedLanguages
    } = req.body;

    // Validation
    if (!title || !description || !inputFormat || !outputFormat || !constraints) {
      return res.status(400).json({
        message: 'Required fields are missing',
        error: 'MISSING_FIELDS'
      });
    }

    if (!sampleTestCases || sampleTestCases.length === 0) {
      return res.status(400).json({
        message: 'At least one sample test case is required',
        error: 'NO_SAMPLE_TEST_CASES'
      });
    }

    if (!hiddenTestCases || hiddenTestCases.length === 0) {
      return res.status(400).json({
        message: 'At least one hidden test case is required',
        error: 'NO_HIDDEN_TEST_CASES'
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .trim() + '-' + Date.now(); // Add timestamp for uniqueness

    // Create new problem
    const problem = new Problem({
      title,
      slug,
      description,
      inputFormat,
      outputFormat,
      constraints,
      difficulty: difficulty || 'Easy',
      tags: tags || [],
      companyTags: companyTags || [],
      sampleTestCases,
      hiddenTestCases,
      timeLimit: timeLimit || 2,
      memoryLimit: memoryLimit || 256,
      supportedLanguages: supportedLanguages || ['c', 'cpp', 'java', 'python'],
      publishedBy: req.user._id,
      publisherName: `${req.user.firstName} ${req.user.lastName}`,
      isPublic: true,
      isActive: true
    });

    await problem.save();

    // Update user's published problems count
    req.user.problemsPublished += 1;
    await req.user.save();

    res.status(201).json({
      message: 'Problem created successfully',
      problem: problem.getPublicData()
    });

  } catch (error) {
    console.error('Create problem error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors,
        error: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      message: 'Server error while creating problem',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/problems/user/my-problems
// @desc    Get current user's published problems
// @access  Private
router.get('/user/my-problems', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const problems = await Problem.find({ publishedBy: req.user._id })
      .select('-hiddenTestCases')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProblems = await Problem.countDocuments({ publishedBy: req.user._id });
    const totalPages = Math.ceil(totalProblems / parseInt(limit));

    res.json({
      message: 'User problems retrieved successfully',
      problems: problems.map(problem => problem.getPublicData()),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProblems,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user problems error:', error);
    res.status(500).json({
      message: 'Server error while fetching user problems',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
