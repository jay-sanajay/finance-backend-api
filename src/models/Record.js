const mongoose = require('mongoose');

/**
 * Financial Record Schema - MongoDB model for financial transactions
 */
const recordSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either income or expense'
    },
    lowercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    minlength: [1, 'Category cannot be empty'],
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Date cannot be in the future'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // Don't include soft delete fields in JSON output
      delete ret.isDeleted;
      delete ret.deletedAt;
      delete ret.deletedBy;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // Don't include soft delete fields in object output
      delete ret.isDeleted;
      delete ret.deletedAt;
      delete ret.deletedBy;
      return ret;
    }
  }
});

// Compound indexes for optimized queries (excluding deleted records)
recordSchema.index({ userId: 1, date: -1, isDeleted: 1 });
recordSchema.index({ userId: 1, type: 1, isDeleted: 1 });
recordSchema.index({ userId: 1, category: 1, isDeleted: 1 });
recordSchema.index({ type: 1, date: -1, isDeleted: 1 });
recordSchema.index({ category: 1, date: -1, isDeleted: 1 });

// Text index for search functionality (only for non-deleted records)
recordSchema.index({ 
  category: 'text', 
  notes: 'text' 
}, {
  partialFilterExpression: { isDeleted: false }
});

// Virtual for formatted date
recordSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0]; // YYYY-MM-DD format
});

// Virtual for relative time
recordSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return this.date > now ? 'Tomorrow' : 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
});

// Static method to get records by user with pagination (excluding deleted)
recordSchema.statics.findByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, type, category, dateFrom, dateTo } = options;
  
  const query = { userId };
  
  if (type) query.type = type;
  if (category) query.category = new RegExp(category, 'i');
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = new Date(dateFrom);
    if (dateTo) query.date.$lte = new Date(dateTo);
  }
  
  return this.find(query)
    .populate('userId', 'name email role')
    .sort({ date: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get summary statistics (excluding deleted)
recordSchema.statics.getSummary = function(userId = null, filters = {}) {
  const matchStage = { isDeleted: { $ne: true } };
  
  if (userId) matchStage.userId = mongoose.Types.ObjectId(userId);
  if (filters.type) matchStage.type = filters.type;
  if (filters.dateFrom || filters.dateTo) {
    matchStage.date = {};
    if (filters.dateFrom) matchStage.date.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchStage.date.$lte = new Date(filters.dateTo);
  }
  
  return this.aggregate([
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
        netAmount: { $subtract: ['$totalIncome', '$totalExpenses'] },
        avgIncome: { $divide: ['$totalIncome', '$incomeTransactions'] },
        avgExpense: { $divide: ['$totalExpenses', '$expenseTransactions'] }
      }
    }
  ]);
};

// Static method to get category breakdown (excluding deleted)
recordSchema.statics.getCategoryBreakdown = function(userId = null, filters = {}) {
  const matchStage = { isDeleted: { $ne: true } };
  
  if (userId) matchStage.userId = mongoose.Types.ObjectId(userId);
  if (filters.type) matchStage.type = filters.type;
  if (filters.dateFrom || filters.dateTo) {
    matchStage.date = {};
    if (filters.dateFrom) matchStage.date.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchStage.date.$lte = new Date(filters.dateTo);
  }
  
  return this.aggregate([
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
  ]);
};

// Instance method for soft delete
recordSchema.methods.softDelete = function(deletedBy = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  if (deletedBy) {
    this.deletedBy = deletedBy;
  }
  return this.save();
};

// Static method to find deleted records
recordSchema.statics.findDeleted = function(userId = null) {
  const query = { isDeleted: true };
  if (userId) query.userId = userId;
  
  return this.find(query)
    .populate('userId', 'name email role')
    .populate('deletedBy', 'name email role')
    .sort({ deletedAt: -1 });
};

// Static method to restore deleted record
recordSchema.statics.restore = function(recordId) {
  return this.findByIdAndUpdate(
    recordId,
    { 
      isDeleted: false, 
      deletedAt: null, 
      deletedBy: null 
    },
    { new: true, runValidators: true }
  );
};

// Static method to permanently delete record
recordSchema.statics.hardDelete = function(recordId) {
  return this.findByIdAndDelete(recordId);
};

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;
