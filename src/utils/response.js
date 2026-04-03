const { HTTP_STATUS } = require('../config/constants');

/**
 * Standardized response utility for consistent API responses
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {*} data - Response data
   * @param {number} statusCode - HTTP status code
   */
  static success(res, message = 'Operation successful', data = null, statusCode = HTTP_STATUS.OK) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Array|string} errors - Error details
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application error code
   */
  static error(res, message = 'Operation failed', errors = [], statusCode = HTTP_STATUS.BAD_REQUEST, errorCode = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors && (Array.isArray(errors) ? errors.length > 0 : errors)) {
      response.errors = Array.isArray(errors) ? errors : [errors];
    }

    if (errorCode) {
      response.code = errorCode;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {Array} items - Paginated items
   * @param {Object} pagination - Pagination metadata
   * @param {number} statusCode - HTTP status code
   */
  static paginated(res, message = 'Data retrieved successfully', items = [], pagination = {}, statusCode = HTTP_STATUS.OK) {
    return this.success(res, message, {
      items,
      pagination: {
        currentPage: pagination.page || 1,
        totalPages: pagination.totalPages || 1,
        totalRecords: pagination.totalRecords || items.length,
        limit: pagination.limit || 10,
        hasNextPage: pagination.hasNextPage || false,
        hasPrevPage: pagination.hasPrevPage || false,
        ...pagination
      }
    }, statusCode);
  }

  /**
   * Send created response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {*} data - Created data
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, message, data, HTTP_STATUS.CREATED);
  }

  /**
   * Send not found response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {string} errorCode - Application error code
   */
  static notFound(res, message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') {
    return this.error(res, message, [], HTTP_STATUS.NOT_FOUND, errorCode);
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {string} errorCode - Application error code
   */
  static unauthorized(res, message = 'Authentication required', errorCode = 'AUTHENTICATION_REQUIRED') {
    return this.error(res, message, [], HTTP_STATUS.UNAUTHORIZED, errorCode);
  }

  /**
   * Send forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {string} errorCode - Application error code
   */
  static forbidden(res, message = 'Access denied', errorCode = 'INSUFFICIENT_PERMISSIONS') {
    return this.error(res, message, [], HTTP_STATUS.FORBIDDEN, errorCode);
  }

  /**
   * Send server error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Error} error - Error object for logging
   */
  static serverError(res, message = 'Internal server error', error = null) {
    if (error) {
      console.error('Server Error:', error);
    }
    return this.error(res, message, [], HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

module.exports = { ApiResponse };
