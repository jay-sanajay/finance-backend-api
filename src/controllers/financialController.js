const financialService = require('../services/financialService');

class FinancialController {
  // Create a new financial record
  async create(req, res) {
    try {
      const result = financialService.create(req.body);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Financial record created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create financial record',
          errors: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Get all financial records with filtering and pagination
  async getAll(req, res) {
    try {
      // Extract query parameters
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId) : undefined,
        type: req.query.type,
        category: req.query.category,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        search: req.query.search
      };

      const pagination = {
        page: req.query.page,
        limit: req.query.limit
      };

      const result = financialService.getAll(filters, pagination);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Financial records retrieved successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to retrieve financial records',
          errors: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Get financial record by ID
  async getById(req, res) {
    try {
      const result = financialService.getById(req.params.id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Financial record retrieved successfully',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Financial record not found',
          errors: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Update a financial record
  async update(req, res) {
    try {
      const result = financialService.update(req.params.id, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Financial record updated successfully',
          data: result.data
        });
      } else {
        if (result.errors.includes('Record not found')) {
          res.status(404).json({
            success: false,
            message: 'Financial record not found',
            errors: result.errors
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to update financial record',
            errors: result.errors
          });
        }
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Delete a financial record
  async delete(req, res) {
    try {
      const result = financialService.delete(req.params.id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Financial record deleted successfully',
          data: result.data
        });
      } else {
        if (result.errors.includes('Record not found')) {
          res.status(404).json({
            success: false,
            message: 'Financial record not found',
            errors: result.errors
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to delete financial record',
            errors: result.errors
          });
        }
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Get financial summary
  async getSummary(req, res) {
    try {
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId) : undefined,
        type: req.query.type,
        category: req.query.category,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const result = financialService.getSummary(filters);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Financial summary retrieved successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to retrieve financial summary',
          errors: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Get available categories
  async getCategories(req, res) {
    try {
      const result = financialService.getCategories();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Categories retrieved successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to retrieve categories',
          errors: result.errors
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Create sample records (for testing)
  async createSampleRecords(req, res) {
    try {
      financialService.createSampleRecords();
      res.status(201).json({
        success: true,
        message: 'Sample financial records created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}

module.exports = new FinancialController();
