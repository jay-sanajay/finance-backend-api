const Record = require('../models/Record');
const User = require('../models/User');

/**
 * Record controller - Handles HTTP requests for financial records using MongoDB
 */
class RecordController {
  /**
   * Create new financial record - Clean implementation without external dependencies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    try {
      const { amount, type, category, date, description, userId } = req.body;

      // Input validation
      const errors = [];
      
      if (!amount) {
        errors.push('Amount is required');
      } else if (typeof amount !== 'number' || isNaN(amount)) {
        errors.push('Amount must be a valid number');
      } else if (amount <= 0) {
        errors.push('Amount must be greater than 0');
      }

      if (!type) {
        errors.push('Type is required');
      } else if (!['income', 'expense'].includes(type)) {
        errors.push('Type must be either income or expense');
      }

      if (!category) {
        errors.push('Category is required');
      } else if (typeof category !== 'string' || category.trim().length === 0) {
        errors.push('Category must be a non-empty string');
      }

      if (description && (typeof description !== 'string' || description.trim().length === 0)) {
        errors.push('Description must be a non-empty string');
      }

      // Determine userId based on role
      let recordUserId = userId;
      if (req.user) {
        if (req.user.role === 'viewer') {
          // Viewers can only create records for themselves
          recordUserId = req.user.id;
        } else if (req.user.role === 'analyst' || req.user.role === 'admin') {
          // Analysts and admins can create records for any user if specified
          recordUserId = userId || req.user.id;
        }
      } else {
        // For testing without authentication, use the first user found
        const testUser = await User.findOne();
        if (testUser) {
          recordUserId = testUser._id;
        } else {
          return res.status(400).json({
            success: false,
            message: 'No users found in database',
            errors: ['Please create a user first'],
            timestamp: new Date().toISOString()
          });
        }
      }

      // Verify user exists
      const user = await User.findById(recordUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          errors: ['Specified user does not exist'],
          timestamp: new Date().toISOString()
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors,
          timestamp: new Date().toISOString()
        });
      }

      // Create record with validated data
      const record = new Record({
        userId: recordUserId,
        amount: parseFloat(amount),
        type: type,
        category: category.trim(),
        date: date ? new Date(date) : new Date(),
        description: description ? description.trim() : ''
      });

      const savedRecord = await record.save();
      
      // Populate user information
      await savedRecord.populate('userId', 'name email role');

      return res.status(201).json({
        success: true,
        message: 'Record created successfully',
        data: {
          record: savedRecord
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create record error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create record',
        errors: ['An unexpected error occurred while creating the record'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all financial records with filtering and pagination - Clean implementation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAll(req, res) {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Validate pagination
      if (page < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid page number',
          errors: ['Page must be greater than 0'],
          timestamp: new Date().toISOString()
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid limit',
          errors: ['Limit must be between 1 and 100'],
          timestamp: new Date().toISOString()
        });
      }

      // Build filter object
      const filter = { isDeleted: { $ne: true } };

      // Apply role-based filtering
      if (req.user) {
        if (req.user.role === 'viewer') {
          // Viewers can only see their own records
          filter.userId = req.user.id;
        }
        // Analysts and admins can see all records unless filtered
      } else {
        // For testing without authentication, show all records
      }

      // Apply optional filters
      if (req.query.type) {
        filter.type = req.query.type;
      }

      if (req.query.category) {
        filter.category = new RegExp(req.query.category, 'i');
      }

      if (req.query.userId) {
        filter.userId = req.query.userId;
      }

      if (req.query.startDate || req.query.endDate) {
        filter.date = {};
        if (req.query.startDate) {
          filter.date.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          filter.date.$lte = new Date(req.query.endDate);
        }
      }

      // Get records with pagination
      const records = await Record.find(filter)
        .populate('userId', 'name email role')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Record.countDocuments(filter);

      return res.status(200).json({
        success: true,
        message: 'Records retrieved successfully',
        data: {
          records,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            limit: limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get all records error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve records',
        errors: ['An unexpected error occurred while retrieving records'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get financial record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.error(res, 'Invalid record ID', ['Invalid record ID format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      const record = await Record.findById(id).populate('userId', 'name email role');

      if (!record) {
        return ApiResponse.notFound(res, 'Record not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Apply role-based access control
      if (req.user.role === 'viewer' && record.userId._id.toString() !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      return ApiResponse.success(res, 'Record retrieved successfully', record);
    } catch (error) {
      console.error('Get record by ID error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve record', error);
    }
  }

  /**
   * Update financial record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.error(res, 'Invalid record ID', ['Invalid record ID format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Validate input data (update mode)
      const { errors, sanitized } = validateFinancialRecord(req.body, true);
      if (errors.length > 0) {
        return ApiResponse.error(res, 'Validation failed', errors, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Find existing record
      const existingRecord = await Record.findById(id);
      if (!existingRecord) {
        return ApiResponse.notFound(res, 'Record not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Apply role-based access control
      if (req.user.role === 'viewer' && existingRecord.userId.toString() !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // If updating userId, verify user exists
      if (sanitized.userId) {
        const user = await User.findById(sanitized.userId);
        if (!user) {
          return ApiResponse.notFound(res, 'User not found', ERROR_CODES.USER_NOT_FOUND);
        }
      }

      // Update record
      const updatedRecord = await Record.findByIdAndUpdate(
        id,
        sanitized,
        { new: true, runValidators: true }
      ).populate('userId', 'name email role');

      return ApiResponse.success(res, 'Record updated successfully', updatedRecord);
    } catch (error) {
      console.error('Update record error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ApiResponse.error(res, 'Validation failed', validationErrors, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      return ApiResponse.serverError(res, 'Failed to update record', error);
    }
  }

  /**
   * Delete financial record (soft delete)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.error(res, 'Invalid record ID', ['Invalid record ID format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Find existing record
      const existingRecord = await Record.findById(id);
      if (!existingRecord) {
        return ApiResponse.notFound(res, 'Record not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Apply role-based access control
      if (req.user.role === 'viewer' && existingRecord.userId.toString() !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Soft delete the record
      await existingRecord.softDelete(req.user.id);

      return ApiResponse.success(res, 'Record deleted successfully', { id });
    } catch (error) {
      console.error('Delete record error:', error);
      return ApiResponse.serverError(res, 'Failed to delete record', error);
    }
  }

  /**
   * Restore deleted financial record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async restore(req, res) {
    try {
      const { id } = req.params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.error(res, 'Invalid record ID', ['Invalid record ID format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Find existing record (including deleted)
      const existingRecord = await Record.findById(id).setOptions({ includeDeleted: true });
      if (!existingRecord) {
        return ApiResponse.notFound(res, 'Record not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Apply role-based access control
      if (req.user.role === 'viewer' && existingRecord.userId.toString() !== req.user.id) {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Check if record is actually deleted
      if (!existingRecord.isDeleted) {
        return ApiResponse.error(res, 'Record is not deleted', ['Record is not deleted'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Restore the record
      const restoredRecord = await Record.restore(id);

      return ApiResponse.success(res, 'Record restored successfully', restoredRecord);
    } catch (error) {
      console.error('Restore record error:', error);
      return ApiResponse.serverError(res, 'Failed to restore record', error);
    }
  }

  /**
   * Get deleted records (admin/analyst only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDeleted(req, res) {
    try {
      // Only admin and analyst can view deleted records
      if (req.user.role === 'viewer') {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      const { page = 1, limit = 10, userId } = req.query;

      // Get deleted records
      const deletedRecords = await Record.findDeleted(userId)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get total count
      const matchStage = { isDeleted: true };
      if (userId) matchStage.userId = userId;
      const total = await Record.countDocuments(matchStage);

      return ApiResponse.paginated(res, 'Deleted records retrieved successfully', deletedRecords, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      });
    } catch (error) {
      console.error('Get deleted records error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve deleted records', error);
    }
  }

  /**
   * Permanently delete financial record (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async hardDelete(req, res) {
    try {
      // Only admin can permanently delete records
      if (req.user.role !== 'admin') {
        return ApiResponse.forbidden(res, 'Access denied', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      const { id } = req.params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.error(res, 'Invalid record ID', ['Invalid record ID format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Find existing record (including deleted)
      const existingRecord = await Record.findById(id).setOptions({ includeDeleted: true });
      if (!existingRecord) {
        return ApiResponse.notFound(res, 'Record not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Permanently delete the record
      await Record.hardDelete(id);

      return ApiResponse.success(res, 'Record permanently deleted', { id });
    } catch (error) {
      console.error('Hard delete record error:', error);
      return ApiResponse.serverError(res, 'Failed to permanently delete record', error);
    }
  }

  /**
   * Get financial summary statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSummary(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build filters
      const filters = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        filters.date = {};
        if (req.query.dateFrom) filters.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) filters.date.$lte = new Date(req.query.dateTo);
      }

      // Get summary using aggregation
      const summary = await Record.getSummary(userId, filters);

      if (summary.length === 0) {
        return ApiResponse.success(res, 'No records found', {
          totalIncome: 0,
          totalExpenses: 0,
          netAmount: 0,
          totalRecords: 0,
          incomeTransactions: 0,
          expenseTransactions: 0,
          avgIncome: 0,
          avgExpense: 0
        });
      }

      return ApiResponse.success(res, 'Summary retrieved successfully', summary[0]);
    } catch (error) {
      console.error('Get summary error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve summary', error);
    }
  }

  /**
   * Get category breakdown
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategoryBreakdown(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build filters
      const filters = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        filters.date = {};
        if (req.query.dateFrom) filters.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) filters.date.$lte = new Date(req.query.dateTo);
      }

      // Get category breakdown using aggregation
      const categories = await Record.getCategoryBreakdown(userId, filters);

      return ApiResponse.success(res, 'Category breakdown retrieved successfully', { categories });
    } catch (error) {
      console.error('Get category breakdown error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve category breakdown', error);
    }
  }

  /**
   * Get available categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategories(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      }

      // Get unique categories
      const categories = await Record.distinct('category', userId ? { userId } : {});

      return ApiResponse.success(res, 'Categories retrieved successfully', { categories });
    } catch (error) {
      console.error('Get categories error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve categories', error);
    }
  }

  /**
   * Create sample records (for testing/demo purposes)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createSampleRecords(req, res) {
    try {
      // Get users to create records for
      const users = await User.find({ status: 'active' }).limit(5);
      
      if (users.length === 0) {
        return ApiResponse.error(res, 'No users found', ['No active users found to create records for'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      const sampleRecords = [
        {
          amount: 5000,
          type: 'income',
          category: 'Salary',
          date: new Date('2024-01-15'),
          notes: 'Monthly salary',
          userId: users[0]._id
        },
        {
          amount: 1200,
          type: 'expense',
          category: 'Rent',
          date: new Date('2024-01-01'),
          notes: 'Monthly rent payment',
          userId: users[0]._id
        },
        {
          amount: 300,
          type: 'expense',
          category: 'Food',
          date: new Date('2024-01-10'),
          notes: 'Grocery shopping',
          userId: users[0]._id
        },
        {
          amount: 1500,
          type: 'income',
          category: 'Freelance',
          date: new Date('2024-01-20'),
          notes: 'Freelance project payment',
          userId: users[1]?._id || users[0]._id
        },
        {
          amount: 200,
          type: 'expense',
          category: 'Transportation',
          date: new Date('2024-01-12'),
          notes: 'Gas and parking',
          userId: users[1]?._id || users[0]._id
        }
      ];

      // Create records
      const createdRecords = await Record.insertMany(sampleRecords);

      return ApiResponse.created(res, 'Sample records created successfully', {
        count: createdRecords.length,
        records: createdRecords
      });
    } catch (error) {
      console.error('Create sample records error:', error);
      return ApiResponse.serverError(res, 'Failed to create sample records', error);
    }
  }
}

// Export singleton instance
module.exports = new RecordController();
