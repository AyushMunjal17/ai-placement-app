const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createLogger } = require('../../shared/logger');
const { getCachedUser, setCachedUser } = require('../lib/userCache');

const logger = createLogger('backend.auth');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token is required',
        error: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cached = getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    // Fetch minimal user fields (fast path).
    const user = await User.findById(decoded.userId)
      .select('_id username role isActive')
      .lean();
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token - user not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Cache + attach
    setCachedUser(user._id, user);
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    logger.error('Auth middleware error', { error });
    return res.status(500).json({ 
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

// Middleware to check if user is admin (for future features)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Admin access required',
      error: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cached = getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    const user = await User.findById(decoded.userId)
      .select('_id username role isActive')
      .lean();

    if (user && user.isActive) {
      setCachedUser(user._id, user);
      req.user = user;
    }
    
    return next();
  } catch (error) {
    // Continue without authentication if token is invalid
    return next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d', // Token expires in 7 days
      issuer: 'ai-placement-system',
      audience: 'ai-placement-users'
    }
  );
};

// Verify and decode token without middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  generateToken,
  verifyToken
};
