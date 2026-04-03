const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Rate limiting middleware configuration
 */
class RateLimiter {
  /**
   * General API rate limiter
   * Limits requests to prevent abuse while allowing legitimate usage
   */
  static generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks and documentation
      return req.path === '/health' || req.path === '/api-docs' || req.path === '/api-docs.json';
    }
  });

  /**
   * Strict rate limiter for authentication endpoints
   * Prevents brute force attacks on login/register
   */
  static authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '15 minutes',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Moderate rate limiter for data modification endpoints
   * Prevents spam while allowing reasonable usage
   */
  static createLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 20, // Limit each IP to 20 create requests per windowMs
    message: {
      success: false,
      message: 'Too many creation requests, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many creation requests, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Lenient rate limiter for read-only endpoints
   * Allows more requests for data retrieval
   */
  static readLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 200, // Limit each IP to 200 read requests per windowMs
    message: {
      success: false,
      message: 'Too many read requests, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many read requests, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Dashboard-specific rate limiter
   * Analytics endpoints can be resource-intensive
   */
  static dashboardLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 30, // Limit each IP to 30 dashboard requests per windowMs
    message: {
      success: false,
      message: 'Too many dashboard requests, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many dashboard requests, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * User-specific rate limiter (for authenticated users)
   * Limits based on user ID rather than IP
   */
  static userLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 150, // Higher limit for authenticated users
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      if (req.user) {
        return `user:${req.user.id}`;
      }
      // Use the built-in IP key generator for proper IPv6 handling
      return rateLimit.keyGenerator(req);
    },
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Development rate limiter (more permissive)
   * Used in development environment to avoid blocking during testing
   */
  static developmentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 1000, // Very high limit for development
    message: {
      success: false,
      message: 'Development rate limit exceeded.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Development rate limit exceeded.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: '1 minute',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Get appropriate rate limiter based on environment
 */
const getRateLimiter = () => {
  if (process.env.NODE_ENV === 'development') {
    return RateLimiter.developmentLimiter;
  }
  return RateLimiter.generalLimiter;
};

/**
 * Rate limiter middleware factory
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 1 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: options.retryAfter || '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: options.message || 'Too many requests, please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: options.retryAfter || '1 minute',
        timestamp: new Date().toISOString()
      });
    },
    ...options
  });
};

module.exports = RateLimiter;
