// Application constants and configuration

// Role hierarchy for access control
const ROLE_HIERARCHY = {
  VIEWER: 'viewer',
  ANALYST: 'analyst', 
  ADMIN: 'admin'
};

// Role levels for hierarchy comparison
const ROLE_LEVELS = {
  [ROLE_HIERARCHY.VIEWER]: 1,
  [ROLE_HIERARCHY.ANALYST]: 2,
  [ROLE_HIERARCHY.ADMIN]: 3
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Error codes
const ERROR_CODES = {
  // Authentication errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MALFORMED: 'TOKEN_MALFORMED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST'
};

// Financial record types
const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// JWT configuration
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  EXPIRES_IN: '24h'
};

// Rate limiting by role
const RATE_LIMITS = {
  [ROLE_HIERARCHY.VIEWER]: { windowMs: 15 * 60 * 1000, max: 100 },
  [ROLE_HIERARCHY.ANALYST]: { windowMs: 15 * 60 * 1000, max: 200 },
  [ROLE_HIERARCHY.ADMIN]: { windowMs: 15 * 60 * 1000, max: 500 }
};

module.exports = {
  ROLE_HIERARCHY,
  ROLE_LEVELS,
  HTTP_STATUS,
  ERROR_CODES,
  TRANSACTION_TYPES,
  PAGINATION,
  JWT_CONFIG,
  RATE_LIMITS
};
