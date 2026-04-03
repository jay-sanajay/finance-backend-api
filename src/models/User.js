const mongoose = require('mongoose');

/**
 * User Schema - MongoDB model for user data
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'analyst', 'viewer'],
      message: 'Role must be either admin, analyst, or viewer'
    },
    default: 'viewer'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: 'Status must be either active, inactive, or suspended'
    },
    default: 'active'
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password; // Remove password from JSON output
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password; // Remove password from object output
      return ret;
    }
  }
});

// Index for faster queries (email already has unique index from schema)
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email }).select('+password');
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' });
};

// Virtual for user's full profile info
userSchema.virtual('profileInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

const User = mongoose.model('User', userSchema);

module.exports = User;
