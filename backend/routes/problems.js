const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/adminAuth');

const router = express.Router();

// @route   GET /api/problems/stats
// @desc    Get platform statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalProblems = await Problem.countDocuments({ isPublic: true, isActive: true });
    const totalUsers = await User.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const acceptedSubmissions = await Submission.countDocuments({ status: 'Accepted' });

    // Calculate overall acceptance rate
    const avgAcceptance = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    res.json({
      totalProblems,
      totalUsers,
      totalSubmissions,
      averageAcceptance: avgAcceptance
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    // Calculate acceptance rate and submission stats for each problem
    const Submission = require('../models/Submission');
    const problemsWithStats = await Promise.all(problems.map(async (problem) => {
      const totalSubmissions = await Submission.countDocuments({ problemId: problem._id });
      const acceptedSubmissions = await Submission.countDocuments({
        problemId: problem._id,
        status: 'Accepted'
      });

      const acceptanceRate = totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

      return {
        ...problem.getPublicData(),
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate
      };
    }));

    res.json({
      message: 'Problems retrieved successfully',
      problems: problemsWithStats,
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
// @desc    Get a specific problem by ID or slug
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const identifier = req.params.id;

    // Try to find by ObjectId first (backward compat), then by slug
    let problem = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      problem = await Problem.findById(identifier)
        .populate('publishedBy', 'username firstName lastName');
    }
    if (!problem) {
      problem = await Problem.findOne({ slug: identifier })
        .populate('publishedBy', 'username firstName lastName');
    }

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

    // Calculate acceptance rate and submission stats
    const totalSubmissions = await Submission.countDocuments({ problemId: problem._id });
    const acceptedSubmissions = await Submission.countDocuments({
      problemId: problem._id,
      status: 'Accepted'
    });

    const acceptanceRate = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    // Return problem without hidden test cases for public access
    const problemData = {
      ...problem.getPublicData(),
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate
    };

    res.json({
      message: 'Problem retrieved successfully',
      problem: problemData
    });

  } catch (error) {
    console.error('Get problem error:', error);
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
      supportedLanguages,
      codeTemplates
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

    // Generate clean slug from title (no timestamp)
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    // Ensure uniqueness by appending a counter if needed
    let slug = baseSlug;
    let counter = 1;
    while (await Problem.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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
      codeTemplates: codeTemplates || {},
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

// @route   POST /api/problems/admin/migrate-slugs
// @desc    Clean existing slugs: strip trailing -<13-digit-timestamp>
// @access  Private (Admin only)
router.post('/admin/migrate-slugs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const problems = await Problem.find({});
    let updated = 0;
    let skipped = 0;

    for (const problem of problems) {
      // Strip trailing timestamp suffix like -1708773819456 (13 digits)
      const cleanSlug = problem.slug.replace(/-\d{13}$/, '');
      if (cleanSlug === problem.slug) {
        skipped++;
        continue;
      }

      // Check if clean slug is already taken by another problem
      const existing = await Problem.findOne({ slug: cleanSlug, _id: { $ne: problem._id } });
      if (existing) {
        // Keep the original if conflict
        skipped++;
        continue;
      }

      problem.slug = cleanSlug;
      await problem.save({ validateBeforeSave: false });
      updated++;
    }

    res.json({
      message: `Migration complete. Updated: ${updated}, Skipped: ${skipped}`,
      updated,
      skipped
    });
  } catch (error) {
    console.error('Migrate slugs error:', error);
    res.status(500).json({ message: 'Server error during migration', error: error.message });
  }
});

module.exports = router;
