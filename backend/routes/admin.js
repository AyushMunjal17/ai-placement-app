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

// @route   GET /api/admin/students/stats
// @desc    Get statistics for all students (for admin dashboard)
// @access  Private (Admin only)
router.get('/students/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('username firstName lastName email problemsSolved totalSubmissions createdAt lastLogin')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(students.map(async (student) => {
      const stats = await Submission.getUserStats(student._id);

      const accuracy = stats.totalSubmissions > 0
        ? ((stats.acceptedSubmissions / stats.totalSubmissions) * 100).toFixed(2)
        : '0.00';

      const lastSubmission = await Submission.findOne({ userId: student._id })
        .sort({ createdAt: -1 })
        .select('createdAt');

      return {
        _id: student._id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        problemsSolved: stats.problemsSolved ?? student.problemsSolved,
        totalSubmissions: stats.totalSubmissions ?? student.totalSubmissions,
        acceptedSubmissions: stats.acceptedSubmissions || 0,
        accuracy: Number(accuracy),
        lastActivity: lastSubmission?.createdAt || student.lastLogin || student.createdAt
      };
    }));

    res.json({ students: enriched });

  } catch (error) {
    console.error('Admin students stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch student statistics',
      error: error.message
    });
  }
});

// @route   GET /api/admin/students/:id
// @desc    Get detailed performance data for a single student
// @access  Private (Admin only)
router.get('/students/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await User.findById(studentId).select('-password');
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        error: 'NOT_FOUND'
      });
    }

    const stats = await Submission.getUserStats(student._id);

    const submissions = await Submission.find({ userId: student._id })
      .populate('problemId', 'title difficulty')
      .sort({ createdAt: -1 });

    const problemMap = {};

    submissions.forEach((sub) => {
      if (!sub.problemId) return;
      const pid = sub.problemId._id.toString();
      if (!problemMap[pid]) {
        problemMap[pid] = {
          problemId: sub.problemId._id,
          title: sub.problemId.title,
          difficulty: sub.problemId.difficulty,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          attemptsUntilFirstAccept: null,
          lastStatus: sub.status,
          firstAttemptAt: null,
          firstAcceptedAt: null,
          lastSubmissionAt: null
        };
      }

      const entry = problemMap[pid];
      entry.totalSubmissions += 1;
      entry.lastStatus = sub.status;
      entry.lastSubmissionAt = entry.lastSubmissionAt && entry.lastSubmissionAt > sub.createdAt
        ? entry.lastSubmissionAt
        : sub.createdAt;

      if (!entry.firstAttemptAt) {
        entry.firstAttemptAt = sub.createdAt;
      }

      if (sub.status === 'Accepted') {
        entry.acceptedSubmissions += 1;
        if (!entry.firstAcceptedAt) {
          entry.firstAcceptedAt = sub.createdAt;
          entry.attemptsUntilFirstAccept = entry.totalSubmissions;
        }
      }
    });

    const problems = Object.values(problemMap).map((entry) => ({
      problemId: entry.problemId,
      title: entry.title,
      difficulty: entry.difficulty,
      totalSubmissions: entry.totalSubmissions,
      acceptedSubmissions: entry.acceptedSubmissions,
      lastStatus: entry.lastStatus,
      lastSubmissionAt: entry.lastSubmissionAt
    }));

    let bestProblem = null;
    let worstProblem = null;

    Object.values(problemMap).forEach((entry) => {
      if (entry.acceptedSubmissions > 0) {
        if (!bestProblem || (entry.attemptsUntilFirstAccept || Infinity) < (bestProblem.attemptsUntilFirstAccept || Infinity)) {
          bestProblem = entry;
        }
      } else {
        if (!worstProblem || entry.totalSubmissions > worstProblem.totalSubmissions) {
          worstProblem = entry;
        }
      }
    });

    const accuracy = stats.totalSubmissions > 0
      ? ((stats.acceptedSubmissions / stats.totalSubmissions) * 100).toFixed(2)
      : '0.00';

    res.json({
      student: {
        _id: student._id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        problemsSolved: stats.problemsSolved,
        totalSubmissions: stats.totalSubmissions,
        acceptedSubmissions: stats.acceptedSubmissions,
        averageScore: stats.averageScore,
        accuracy: Number(accuracy),
        lastActivity: submissions[0]?.createdAt || student.lastLogin || student.createdAt
      },
      problems,
      bestProblem: bestProblem ? {
        problemId: bestProblem.problemId,
        title: bestProblem.title,
        difficulty: bestProblem.difficulty,
        totalSubmissions: bestProblem.totalSubmissions,
        attemptsUntilFirstAccept: bestProblem.attemptsUntilFirstAccept
      } : null,
      worstProblem: worstProblem ? {
        problemId: worstProblem.problemId,
        title: worstProblem.title,
        difficulty: worstProblem.difficulty,
        totalSubmissions: worstProblem.totalSubmissions
      } : null
    });

  } catch (error) {
    console.error('Admin student detail error:', error);
    res.status(500).json({
      message: 'Failed to fetch student details',
      error: error.message
    });
  }
});

module.exports = router;
