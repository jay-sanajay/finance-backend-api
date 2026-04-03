/**
 * Validation utilities for data validation and sanitization
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate date string (YYYY-MM-DD format)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid date
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

/**
 * Validate positive number
 * @param {number} value - Number to validate
 * @returns {boolean} - True if valid positive number
 */
const isPositiveNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) && value > 0;
};

/**
 * Validate transaction type
 * @param {string} type - Transaction type to validate
 * @returns {boolean} - True if valid transaction type
 */
const isValidTransactionType = (type) => {
  return ['income', 'expense'].includes(type);
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {boolean} - True if valid role
 */
const isValidRole = (role) => {
  return ['viewer', 'analyst', 'admin'].includes(role);
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
};

/**
 * Validate and sanitize user data
 * @param {Object} userData - User data to validate
 * @param {boolean} isLogin - Whether this is login validation (relaxed rules)
 * @returns {Object} - Validation result with errors and sanitized data
 */
const validateUserData = (userData, isLogin = false) => {
  const errors = [];
  const sanitized = {};

  // Email validation
  if (!userData.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  } else {
    sanitized.email = userData.email.toLowerCase().trim();
  }

  // Password validation
  if (!userData.password) {
    errors.push('Password is required');
  } else if (userData.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  } else {
    sanitized.password = userData.password;
  }

  // Name validation (only for registration)
  if (!isLogin) {
    if (!userData.name) {
      errors.push('Name is required');
    } else if (userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (userData.name.length > 50) {
      errors.push('Name must not exceed 50 characters');
    } else {
      sanitized.name = sanitizeString(userData.name);
    }

    // Role validation (optional)
    if (userData.role) {
      if (!isValidRole(userData.role)) {
        errors.push('Invalid role. Must be viewer, analyst, or admin');
      } else {
        sanitized.role = userData.role.toLowerCase();
      }
    }
  }

  return { errors, sanitized };
};

/**
 * Validate and sanitize financial record data
 * @param {Object} recordData - Record data to validate
 * @param {boolean} isUpdate - Whether this is update validation (relaxed rules)
 * @returns {Object} - Validation result with errors and sanitized data
 */
const validateFinancialRecord = (recordData, isUpdate = false) => {
  const errors = [];
  const sanitized = {};

  // Amount validation
  if (recordData.amount !== undefined && recordData.amount !== null) {
    if (!isPositiveNumber(recordData.amount)) {
      errors.push('Amount must be a positive number');
    } else {
      sanitized.amount = parseFloat(recordData.amount);
    }
  } else if (!isUpdate) {
    errors.push('Amount is required');
  }

  // Type validation
  if (recordData.type !== undefined) {
    if (!isValidTransactionType(recordData.type)) {
      errors.push('Type must be either income or expense');
    } else {
      sanitized.type = recordData.type.toLowerCase();
    }
  } else if (!isUpdate) {
    errors.push('Type is required');
  }

  // Category validation
  if (recordData.category !== undefined) {
    const category = sanitizeString(recordData.category);
    if (!category) {
      errors.push('Category cannot be empty');
    } else if (category.length > 50) {
      errors.push('Category must not exceed 50 characters');
    } else {
      sanitized.category = category;
    }
  } else if (!isUpdate) {
    errors.push('Category is required');
  }

  // Date validation
  if (recordData.date !== undefined) {
    if (!isValidDate(recordData.date)) {
      errors.push('Date must be a valid date in YYYY-MM-DD format');
    } else {
      const date = new Date(recordData.date);
      if (date > new Date()) {
        errors.push('Date cannot be in the future');
      }
      sanitized.date = recordData.date;
    }
  } else if (!isUpdate) {
    errors.push('Date is required');
  }

  // Notes validation (optional)
  if (recordData.notes !== undefined && recordData.notes !== null) {
    const notes = sanitizeString(recordData.notes);
    if (notes.length > 500) {
      errors.push('Notes must not exceed 500 characters');
    } else {
      sanitized.notes = notes;
    }
  }

  // User ID validation (MongoDB ObjectId)
  if (recordData.userId !== undefined) {
    if (typeof recordData.userId === 'string' && recordData.userId.match(/^[0-9a-fA-F]{24}$/)) {
      sanitized.userId = recordData.userId;
    } else {
      errors.push('User ID must be a valid MongoDB ObjectId');
    }
  } else if (!isUpdate) {
    errors.push('User ID is required');
  }

  return { errors, sanitized };
};

/**
 * Validate pagination parameters
 * @param {Object} queryParams - Query parameters
 * @returns {Object} - Validated pagination parameters
 */
const validatePagination = (queryParams) => {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;

  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100) // Between 1 and 100
  };
};

/**
 * Validate query filters for financial records
 * @param {Object} queryParams - Query parameters
 * @returns {Object} - Validated filters
 */
const validateFinancialFilters = (queryParams) => {
  const filters = {};

  // User ID filter (MongoDB ObjectId)
  if (queryParams.userId) {
    if (typeof queryParams.userId === 'string' && queryParams.userId.match(/^[0-9a-fA-F]{24}$/)) {
      filters.userId = queryParams.userId;
    }
  }

  // Type filter
  if (queryParams.type && isValidTransactionType(queryParams.type)) {
    filters.type = queryParams.type.toLowerCase();
  }

  // Category filter
  if (queryParams.category) {
    const category = sanitizeString(queryParams.category);
    if (category) {
      filters.category = category;
    }
  }

  // Date range filters
  if (queryParams.dateFrom && isValidDate(queryParams.dateFrom)) {
    filters.dateFrom = queryParams.dateFrom;
  }

  if (queryParams.dateTo && isValidDate(queryParams.dateTo)) {
    filters.dateTo = queryParams.dateTo;
  }

  // Search filter
  if (queryParams.search) {
    const search = sanitizeString(queryParams.search);
    if (search) {
      filters.search = search;
    }
  }

  return filters;
};

module.exports = {
  isValidEmail,
  isValidDate,
  isPositiveNumber,
  isValidTransactionType,
  isValidRole,
  sanitizeString,
  validateUserData,
  validateFinancialRecord,
  validatePagination,
  validateFinancialFilters
};
