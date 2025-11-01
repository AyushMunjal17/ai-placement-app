const express = require('express');
const User = require('../models/User');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { authenticateToken } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/adminAuth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get all problems with admin details
    const problems = await Problem.find({})
      .populate('publishedBy', 'username firstName lastName email')
      .sort({ createdAt: -1 })
      .select('title difficulty tags isPublic isActive createdAt publishedBy');

    // Get all admins
    const admins = await User.find({ role: 'admin' })
      .select('username firstName lastName email problemsPublished createdAt')
      .sort({ createdAt: -1 });

    // Get statistics
    const totalProblems = await Problem.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalSubmissions = await Submission.countDocuments();
    const activeProblems = await Problem.countDocuments({ isPublic: true, isActive: true });

    res.json({
      problems,
      admins,
      statistics: {
        totalProblems,
        totalStudents,
        totalSubmissions,
        activeProblems,
        totalAdmins: admins.length
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      message: 'Failed to fetch admin dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/admin/problems
// @desc    Get all problems for admin
// @access  Private (Admin only)
router.get('/problems', authenticateToken, isAdmin, async (req, res) => {
  try {
    const problems = await Problem.find({})
      .populate('publishedBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ problems });

  } catch (error) {
    console.error('Get admin problems error:', error);
    res.status(500).json({
      message: 'Failed to fetch problems',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (students and admins)
// @access  Private (Admin only)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { role } = req.query;

    const filter = role ? { role } : {};
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/problems/:id
// @desc    Delete a problem
// @access  Private (Admin only)
router.delete('/problems/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'NOT_FOUND'
      });
    }

    await Problem.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Problem deleted successfully'
    });

  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({
      message: 'Failed to delete problem',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/problems/:id/toggle-status
// @desc    Toggle problem active status
// @access  Private (Admin only)
router.put('/problems/:id/toggle-status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        message: 'Problem not found',
        error: 'NOT_FOUND'
      });
    }

    problem.isActive = !problem.isActive;
    await problem.save();

    res.json({
      message: `Problem ${problem.isActive ? 'activated' : 'deactivated'} successfully`,
      problem
    });

  } catch (error) {
    console.error('Toggle problem status error:', error);
    res.status(500).json({
      message: 'Failed to toggle problem status',
      error: error.message
    });
  }
});

module.exports = router;
