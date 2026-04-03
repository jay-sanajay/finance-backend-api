const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication controller - Handles HTTP requests for authentication using MongoDB
 */
class AuthController {
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Register new user - Clean implementation without external dependencies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { name, email, password, role = 'viewer' } = req.body;

      // Input validation
      const errors = [];
      
      if (!name) {
        errors.push('Name is required');
      } else if (typeof name !== 'string') {
        errors.push('Name must be a string');
      } else if (name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
      } else if (name.trim().length > 50) {
        errors.push('Name must not exceed 50 characters');
      }

      if (!email) {
        errors.push('Email is required');
      } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push('Invalid email format');
        }
      }

      if (!password) {
        errors.push('Password is required');
      } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
      } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
      } else if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
      }

      const validRoles = ['viewer', 'analyst', 'admin'];
      if (role && !validRoles.includes(role)) {
        errors.push('Role must be viewer, analyst, or admin');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors,
          timestamp: new Date().toISOString()
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
          errors: ['Email already exists'],
          timestamp: new Date().toISOString()
        });
      }

      // Create new user object with hashed password
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword, // Pre-hashed password
        role: role.toLowerCase()
      });

      // Save user to database
      const savedUser = await newUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: savedUser._id, 
          email: savedUser.email, 
          role: savedUser.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return success response (exclude password)
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            status: savedUser.status,
            createdAt: savedUser.createdAt
          },
          token: token
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle MongoDB duplicate key error (email uniqueness)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        if (field === 'email') {
          return res.status(400).json({
            success: false,
            message: 'Email already exists',
            errors: ['Email already exists'],
            timestamp: new Date().toISOString()
          });
        }
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString()
        });
      }

      // Handle other database errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          errors: ['Failed to save user to database'],
          timestamp: new Date().toISOString()
        });
      }

      // Generic server error
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        errors: ['An unexpected error occurred during registration'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Login user - Clean implementation without external dependencies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Input validation
      const errors = [];
      
      if (!email) {
        errors.push('Email is required');
      } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push('Invalid email format');
        }
      }

      if (!password) {
        errors.push('Password is required');
      } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors,
          timestamp: new Date().toISOString()
        });
      }

      // Find user by email (include password field)
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          errors: ['Invalid email or password'],
          timestamp: new Date().toISOString()
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive',
          errors: ['Account has been deactivated'],
          timestamp: new Date().toISOString()
        });
      }

      // Verify password
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          errors: ['Invalid email or password'],
          timestamp: new Date().toISOString()
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return success response (exclude password)
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
          },
          token: token
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Login error:', error);
      
      // Handle database errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          errors: ['Failed to authenticate user'],
          timestamp: new Date().toISOString()
        });
      }

      // Generic server error
      return res.status(500).json({
        success: false,
        message: 'Login failed',
        errors: ['An unexpected error occurred during login'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user profile - Clean implementation without external dependencies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      // User is already attached to req by authenticateToken middleware
      const userId = req.user.id;

      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          errors: ['User account not found'],
          timestamp: new Date().toISOString()
        });
      }

      // Return user profile (exclude password)
      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      // Handle database errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          errors: ['Failed to retrieve profile'],
          timestamp: new Date().toISOString()
        });
      }

      // Generic server error
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        errors: ['An unexpected error occurred'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, status } = req.query;
      
      // Build filter
      const filter = {};
      if (role) filter.role = role;
      if (status) filter.status = status;

      // Get users with pagination
      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(filter);

      return ApiResponse.success(res, 'Users retrieved successfully', {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: parseInt(limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve users', error);
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const userId = req.user.id;

      // Validate input
      const updateData = {};
      if (name) {
        if (name.length < 2 || name.length > 50) {
          return ApiResponse.error(res, 'Invalid name', ['Name must be between 2 and 50 characters'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
        }
        updateData.name = name.trim();
      }

      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return ApiResponse.error(res, 'Invalid email format', ['Invalid email format'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
        }
        
        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
        if (existingUser) {
          return ApiResponse.error(res, 'Email already exists', ['Email already exists'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.DUPLICATE_RESOURCE);
        }
        
        updateData.email = email.toLowerCase().trim();
      }

      if (Object.keys(updateData).length === 0) {
        return ApiResponse.error(res, 'No valid fields to update', ['At least one field (name or email) is required'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      return ApiResponse.success(res, 'Profile updated successfully', updatedUser.profileInfo);
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ApiResponse.error(res, 'Validation failed', validationErrors, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      return ApiResponse.serverError(res, 'Failed to update profile', error);
    }
  }

  /**
   * Change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!currentPassword || !newPassword) {
        return ApiResponse.error(res, 'Missing required fields', ['Current password and new password are required'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      if (newPassword.length < 6) {
        return ApiResponse.error(res, 'Invalid password', ['New password must be at least 6 characters'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return ApiResponse.notFound(res, 'User not found', ERROR_CODES.USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return ApiResponse.error(res, 'Invalid current password', ['Current password is incorrect'], HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
      }

      // Update password
      user.password = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
      return ApiResponse.serverError(res, 'Failed to change password', error);
    }
  }
}

// Export singleton instance
module.exports = new AuthController();
