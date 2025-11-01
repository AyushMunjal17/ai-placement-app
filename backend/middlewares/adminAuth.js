// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  try {
    // Check if user exists (from authenticateToken middleware)
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
        error: 'FORBIDDEN'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      message: 'Server error during authorization',
      error: error.message
    });
  }
};

module.exports = { isAdmin };
