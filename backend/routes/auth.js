const express = require('express');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'All fields are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(400).json({
        message: `User with this ${field} already exists`,
        error: 'USER_EXISTS'
      });
    }

    // Check if username is taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: 'Username is already taken',
        error: 'USERNAME_TAKEN'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userData = user.getPublicProfile();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors,
        error: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      message: 'Server error during registration',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    console.log('🔐 Login attempt:', { identifier, passwordLength: password?.length });

    // Validation
    if (!identifier || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        message: 'Email/username and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email or username
    console.log('🔍 Looking for user with identifier:', identifier);
    const user = await User.findByEmailOrUsername(identifier);
    
    if (!user) {
      console.log('❌ User not found with identifier:', identifier);
      return res.status(401).json({
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ User found:', { id: user._id, email: user.email, username: user.username });

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ Account is deactivated');
      return res.status(401).json({
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    console.log('✅ Account is active');

    // Check password
    console.log('🔐 Checking password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ Login successful for user:', user.email);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userData = user.getPublicProfile();

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userData = req.user.getPublicProfile();
    res.json({
      message: 'Profile retrieved successfully',
      user: userData
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      message: 'Server error while fetching profile',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, profilePicture } = req.body;
    const userId = req.user._id;

    // Update allowed fields only
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (profilePicture !== undefined) updateFields.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    const userData = updatedUser.getPublicProfile();

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors,
        error: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      message: 'Server error while updating profile',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
        error: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get user with password
    const user = await User.findById(userId);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect',
        error: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      message: 'Server error while changing password',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post('/verify-token', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user.getPublicProfile()
  });
});

module.exports = router;
