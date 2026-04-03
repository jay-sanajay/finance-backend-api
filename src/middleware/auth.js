const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Role hierarchy for access control
const ROLE_HIERARCHY = {
  'viewer': 1,
  'analyst': 2,
  'admin': 3
};

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required',
      errors: ['Missing authorization token'],
      code: 'TOKEN_MISSING'
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      let errorMessage = 'Invalid token';
      let errorCode = 'TOKEN_INVALID';
      
      if (err.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token format';
        errorCode = 'TOKEN_MALFORMED';
      }

      return res.status(403).json({
        success: false,
        message: errorMessage,
        errors: [errorMessage],
        code: errorCode,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Verify user still exists and is active
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'User account not found',
          errors: ['User does not exist'],
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive',
          errors: ['Account has been deactivated'],
          code: 'ACCOUNT_INACTIVE',
          timestamp: new Date().toISOString()
        });
      }

      // Attach user to request object
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed',
        errors: ['An error occurred during authentication'],
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Role-based authorization middleware with hierarchy support
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated'],
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    
    // Check if user role exists in hierarchy
    if (userRoleLevel === undefined) {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
        errors: [`User role '${userRole}' is not recognized`],
        code: 'INVALID_ROLE'
      });
    }

    // Check if user has any of the allowed roles or higher in hierarchy
    const hasAccess = allowedRoles.some(allowedRole => {
      const allowedRoleLevel = ROLE_HIERARCHY[allowedRole];
      return allowedRoleLevel !== undefined && userRoleLevel >= allowedRoleLevel;
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [
          `Current role: ${userRole}`,
          `Required role: ${allowedRoles.join(' or ')} or higher`
        ],
        code: 'INSUFFICIENT_PERMISSIONS',
        currentRole: userRole,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Minimum role level middleware
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated'],
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const minimumRoleLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel === undefined) {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
        errors: [`User role '${req.user.role}' is not recognized`],
        code: 'INVALID_ROLE'
      });
    }

    if (minimumRoleLevel === undefined) {
      return res.status(500).json({
        success: false,
        message: 'Invalid minimum role specified',
        errors: [`Role '${minimumRole}' is not recognized`],
        code: 'INVALID_MINIMUM_ROLE'
      });
    }

    if (userRoleLevel < minimumRoleLevel) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [
          `Current role: ${req.user.role}`,
          `Minimum required role: ${minimumRole}`
        ],
        code: 'INSUFFICIENT_PERMISSIONS',
        currentRole: req.user.role,
        minimumRequiredRole: minimumRole
      });
    }

    next();
  };
};

// Same user or admin middleware (users can access their own resources or admins can access any)
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: ['User not authenticated'],
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  const targetUserId = parseInt(req.params.id || req.params.userId);
  const isOwnResource = req.user.id === targetUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwnResource && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      errors: ['You can only access your own resources or need admin privileges'],
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.status === 'active') {
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt
      };
    }
  } catch (error) {
    // Silently ignore token errors for optional auth
  }
  next();
};

// Check if user has specific role
const hasRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated'],
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [`Required role: ${role}, Current role: ${req.user.role}`],
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Rate limiting middleware based on user role
const roleBasedRateLimit = (limits = {}) => {
  const defaultLimits = {
    'viewer': { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    'analyst': { windowMs: 15 * 60 * 1000, max: 200 }, // 200 requests per 15 minutes
    'admin': { windowMs: 15 * 60 * 1000, max: 500 } // 500 requests per 15 minutes
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated'],
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const limit = { ...defaultLimits[userRole], ...limits[userRole] };

    // This would integrate with a rate limiting library like express-rate-limit
    // For now, we'll just pass through
    req.rateLimit = limit;
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireMinimumRole,
  authorizeSelfOrAdmin,
  optionalAuth,
  hasRole,
  roleBasedRateLimit,
  ROLE_HIERARCHY
};
