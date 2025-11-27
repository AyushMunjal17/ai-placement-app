const express = require('express');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middlewares/auth');
const { sendOTPEmail, sendPasswordResetOTP, generateOTP } = require('../utils/emailService');

const router = express.Router();

// Email validation function
const isValidEmail = (email) => {
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Validation
    if (!username || !email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        message: 'All fields are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
        error: 'INVALID_EMAIL'
      });
    }

    // Validate role
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be either "student" or "admin"',
        error: 'INVALID_ROLE'
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

    // Handle admin registration - requires approval
    let userRole = role;
    let adminApprovalStatus = 'none';
    let requestedAdminRoleAt = null;

    if (role === 'admin') {
      // New admin requests: register as student, pending approval
      userRole = 'student';
      adminApprovalStatus = 'pending';
      requestedAdminRoleAt = new Date();
    }

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: userRole,
      adminApprovalStatus,
      requestedAdminRoleAt,
      emailVerificationOTP: otp,
      emailVerificationOTPExpires: otpExpires
    });

    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, firstName);
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Still allow registration, but user needs to request OTP resend
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userData = user.getPublicProfile();

    // Different message for admin requests
    const message = role === 'admin' 
      ? 'Your admin account request has been submitted and is pending approval. Please verify your email to complete registration.'
      : 'Registration successful! Please check your email for the verification OTP.';

    res.status(201).json({
      message,
      token,
      user: userData,
      requiresApproval: role === 'admin',
      requiresEmailVerification: true,
      emailSent: emailResult.success
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

    // Check if email is verified
    // Allow legacy accounts (created before email verification feature) to login
    // Legacy accounts have emailVerificationOTP as null (never set)
    const isLegacyAccount = user.emailVerificationOTP === null && user.emailVerificationOTPExpires === null;
    
    if (!user.isEmailVerified && !isLegacyAccount) {
      // For new accounts that need verification
      return res.status(403).json({
        message: 'Please verify your email address before logging in. Check your email for the OTP.',
        error: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true
      });
    }

    // Auto-verify legacy accounts on first login (backward compatibility)
    if (isLegacyAccount && !user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
      console.log('✅ Legacy account auto-verified:', user.email);
    }

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

// @route   POST /api/auth/send-verification-otp
// @desc    Send OTP to user's email for verification
// @access  Private
router.post('/send-verification-otp', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
        error: 'ALREADY_VERIFIED'
      });
    }

    // Prevent sending OTP too frequently (within last 60 seconds)
    if (user.emailVerificationOTPExpires) {
      const timeSinceLastOTP = Date.now() - user.emailVerificationOTPExpires.getTime() + (10 * 60 * 1000);
      const secondsSinceLastOTP = Math.floor(timeSinceLastOTP / 1000);
      
      if (secondsSinceLastOTP < 60) {
        const remainingSeconds = 60 - secondsSinceLastOTP;
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
          error: 'RATE_LIMIT',
          retryAfter: remainingSeconds
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpires = otpExpires;
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(user.email, otp, user.firstName);
    
    if (!emailResult.success) {
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again later.',
        error: 'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      message: 'Verification OTP sent to your email. Please check your inbox.',
      expiresIn: 10 // minutes
    });

  } catch (error) {
    console.error('Send verification OTP error:', error);
    res.status(500).json({
      message: 'Server error while sending verification OTP',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Private
router.post('/verify-email', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = req.user;

    // Validation
    if (!otp) {
      return res.status(400).json({
        message: 'OTP is required',
        error: 'MISSING_OTP'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
        error: 'ALREADY_VERIFIED'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires) {
      return res.status(400).json({
        message: 'No OTP found. Please request a new OTP.',
        error: 'NO_OTP'
      });
    }

    if (new Date() > user.emailVerificationOTPExpires) {
      return res.status(400).json({
        message: 'OTP has expired. Please request a new OTP.',
        error: 'OTP_EXPIRED'
      });
    }

    // Verify OTP
    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        error: 'INVALID_OTP'
      });
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpires = null;
    await user.save();

    // Return updated user data
    const userData = user.getPublicProfile();

    res.json({
      message: 'Email verified successfully!',
      user: userData
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      message: 'Server error while verifying email',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
        error: 'INVALID_EMAIL'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success message (security: don't reveal if email exists)
    if (!user) {
      return res.json({
        message: 'If an account with this email exists, a password reset OTP has been sent.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Account is deactivated. Please contact support.',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Prevent sending OTP too frequently (within last 60 seconds)
    if (user.resetPasswordOTPExpires) {
      const timeSinceLastOTP = Date.now() - user.resetPasswordOTPExpires.getTime() + (10 * 60 * 1000);
      const secondsSinceLastOTP = Math.floor(timeSinceLastOTP / 1000);
      
      if (secondsSinceLastOTP < 60) {
        const remainingSeconds = 60 - secondsSinceLastOTP;
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
          error: 'RATE_LIMIT',
          retryAfter: remainingSeconds
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with reset OTP
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();

    // Send password reset OTP email
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.firstName);
    
    if (!emailResult.success) {
      return res.status(500).json({
        message: 'Failed to send password reset email. Please try again later.',
        error: 'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      message: 'If an account with this email exists, a password reset OTP has been sent to your email.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Server error while processing password reset request',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: 'Email, OTP, and new password are required',
        error: 'MISSING_FIELDS'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
        error: 'INVALID_EMAIL'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        message: 'Invalid email or OTP',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        message: 'No password reset request found. Please request a new OTP.',
        error: 'NO_OTP'
      });
    }

    if (new Date() > user.resetPasswordOTPExpires) {
      return res.status(400).json({
        message: 'OTP has expired. Please request a new password reset.',
        error: 'OTP_EXPIRED'
      });
    }

    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        error: 'INVALID_OTP'
      });
    }

    // Reset password
    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.json({
      message: 'Password reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Server error while resetting password',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
