const Record = require('../models/Record');

/**
 * Dashboard controller - Handles financial analytics using MongoDB aggregation pipelines
 */
class DashboardController {
  /**
   * Get main dashboard summary - Clean implementation without external dependencies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboard(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user && req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build match stage
      const matchStage = { isDeleted: { $ne: true } };
      if (userId) matchStage.userId = userId;

      // Get overall summary
      const overallSummary = await Record.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            transactionCount: { $sum: 1 },
            averageIncome: {
              $avg: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', null] }
            },
            averageExpense: {
              $avg: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', null] }
            }
          }
        }
      ]);

      // Get category breakdown
      const categoryBreakdown = await Record.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            type: { $first: '$type' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      // Get recent transactions
      const recentTransactions = await Record.find(matchStage)
        .populate('userId', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .limit(10);

      // Calculate net balance
      const summary = overallSummary[0] || {
        totalIncome: 0,
        totalExpenses: 0,
        transactionCount: 0,
        averageIncome: 0,
        averageExpense: 0
      };

      const netBalance = summary.totalIncome - summary.totalExpenses;

      return res.status(200).json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: {
          summary: {
            totalIncome: summary.totalIncome,
            totalExpenses: summary.totalExpenses,
            netBalance: netBalance,
            transactionCount: summary.transactionCount,
            averageIncome: summary.averageIncome || 0,
            averageExpense: summary.averageExpense || 0
          },
          categoryBreakdown,
          recentTransactions,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard data',
        errors: ['An unexpected error occurred while retrieving dashboard data'],
        timestamp: new Date().toISOString()
      });
    }
  }
  /**
   * Get overall financial summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOverallSummary(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build match stage
      const matchStage = {};
      if (userId) matchStage.userId = userId;
      if (req.query.type) matchStage.type = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        matchStage.date = {};
        if (req.query.dateFrom) matchStage.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) matchStage.date.$lte = new Date(req.query.dateTo);
      }

      // Comprehensive aggregation pipeline
      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            totalRecords: { $sum: 1 },
            incomeTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
            },
            expenseTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
            },
            avgIncome: {
              $avg: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', null] }
            },
            avgExpense: {
              $avg: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', null] }
            }
          }
        },
        {
          $addFields: {
            netBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
            profitMargin: {
              $cond: [
                { $eq: ['$totalIncome', 0] },
                0,
                { $multiply: [{ $divide: [{ $subtract: ['$totalIncome', '$totalExpenses'] }, '$totalIncome'] }, 100] }
              ]
            }
          }
        }
      ];

      const result = await Record.aggregate(pipeline);

      if (result.length === 0) {
        return ApiResponse.success(res, 'No data found', {
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          totalRecords: 0,
          incomeTransactions: 0,
          expenseTransactions: 0,
          avgIncome: 0,
          avgExpense: 0,
          profitMargin: 0
        });
      }

      return ApiResponse.success(res, 'Overall summary retrieved successfully', result[0]);
    } catch (error) {
      console.error('Get overall summary error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve overall summary', error);
    }
  }

  /**
   * Get category-wise aggregation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategoryAggregation(req, res) {
    try {
      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build match stage
      const matchStage = {};
      if (userId) matchStage.userId = userId;
      if (req.query.type) matchStage.type = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        matchStage.date = {};
        if (req.query.dateFrom) matchStage.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) matchStage.date.$lte = new Date(req.query.dateTo);
      }

      // Category aggregation pipeline
      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$category',
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            transactionCount: { $sum: 1 },
            incomeTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
            },
            expenseTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            category: '$_id',
            netAmount: { $subtract: ['$totalIncome', '$totalExpenses'] },
            totalAmount: { $add: ['$totalIncome', '$totalExpenses'] }
          }
        },
        { $project: { _id: 0 } },
        { $sort: { totalAmount: -1 } }
      ];

      const categories = await Record.aggregate(pipeline);

      // Calculate totals
      const totals = categories.reduce((acc, cat) => {
        acc.totalIncome += cat.totalIncome;
        acc.totalExpenses += cat.totalExpenses;
        acc.totalTransactions += cat.transactionCount;
        return acc;
      }, { totalIncome: 0, totalExpenses: 0, totalTransactions: 0 });

      return ApiResponse.success(res, 'Category aggregation retrieved successfully', {
        categories,
        totals,
        categoryCount: categories.length
      });
    } catch (error) {
      console.error('Get category aggregation error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve category aggregation', error);
    }
  }

  /**
   * Get recent transactions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentTransactions(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);

      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build match stage
      const matchStage = {};
      if (userId) matchStage.userId = userId;
      if (req.query.type) matchStage.type = req.query.type;
      if (req.query.category) matchStage.category = new RegExp(req.query.category, 'i');

      // Recent transactions pipeline
      const pipeline = [
        { $match: matchStage },
        { $sort: { date: -1, createdAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              { $project: { name: 1, email: 1, role: 1 } }
            ]
          }
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
            timeAgo: {
              $let: {
                vars: {
                  daysDiff: {
                    $divide: [
                      { $subtract: [new Date(), '$date'] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                },
                in: {
                  $switch: {
                    branches: [
                      { case: { $lte: ['$$daysDiff', 0] }, then: 'Today' },
                      { case: { $lte: ['$$daysDiff', 1] }, then: 'Yesterday' },
                      { case: { $lte: ['$$daysDiff', 7] }, then: 'This week' },
                      { case: { $lte: ['$$daysDiff', 30] }, then: 'This month' }
                    ],
                    default: 'Older'
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            __v: 0
          }
        }
      ];

      const transactions = await Record.aggregate(pipeline);

      return ApiResponse.success(res, 'Recent transactions retrieved successfully', {
        transactions,
        count: transactions.length
      });
    } catch (error) {
      console.error('Get recent transactions error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve recent transactions', error);
    }
  }

  /**
   * Get monthly summary with trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMonthlySummary(req, res) {
    try {
      const months = Math.min(parseInt(req.query.months) || 12, 24);

      // Apply role-based filtering
      let userId = null;
      if (req.user.role === 'viewer') {
        userId = req.user.id;
      } else if (req.query.userId) {
        userId = req.query.userId;
      }

      // Build match stage
      const matchStage = {};
      if (userId) matchStage.userId = userId;
      if (req.query.type) matchStage.type = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        matchStage.date = {};
        if (req.query.dateFrom) matchStage.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) matchStage.date.$lte = new Date(req.query.dateTo);
      }

      // Monthly summary pipeline
      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            transactionCount: { $sum: 1 },
            incomeTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
            },
            expenseTransactions: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }
              ]
            },
            netAmount: { $subtract: ['$totalIncome', '$totalExpenses'] },
            savingsRate: {
              $cond: [
                { $eq: ['$totalIncome', 0] },
                0,
                { $multiply: [{ $divide: [{ $subtract: ['$totalIncome', '$totalExpenses'] }, '$totalIncome'] }, 100] }
              ]
            }
          }
        },
        { $sort: { month: -1 } },
        { $limit: months },
        { $project: { _id: 0, year: '$_id.year', month: 1, totalIncome: 1, totalExpenses: 1, netAmount: 1, transactionCount: 1, incomeTransactions: 1, expenseTransactions: 1, savingsRate: 1 } }
      ];

      const monthlyData = await Record.aggregate(pipeline);

      return ApiResponse.success(res, 'Monthly summary retrieved successfully', {
        monthlySummary: monthlyData,
        period: {
          months: monthlyData.length,
          startMonth: monthlyData[monthlyData.length - 1]?.month,
          endMonth: monthlyData[0]?.month
        }
      });
    } catch (error) {
      console.error('Get monthly summary error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve monthly summary', error);
    }
  }
}

// Export singleton instance
module.exports = new DashboardController();
