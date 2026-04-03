const jwt = require('jsonwebtoken');
const { ApiResponse } = require('../utils/response');
const { JWT_CONFIG, ERROR_CODES, HTTP_STATUS } = require('../config/constants');

/**
 * Authentication service - Handles business logic for authentication
 */
class AuthService {
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_CONFIG.SECRET,
      { expiresIn: JWT_CONFIG.EXPIRES_IN }
    );
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Object} - Registration result
   */
  async register(userData) {
    try {
      // Check if user already exists
      const User = require('../models/User');
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return ApiResponse.error(null, 'Email already exists', ['Email already exists'], HTTP_STATUS.BAD_REQUEST, ERROR_CODES.DUPLICATE_RESOURCE);
      }

      // Create user
      const newUser = await User.create(userData);
      
      // Generate token
      const token = this.generateToken(newUser);

      return ApiResponse.created(null, 'User registered successfully', {
        user: newUser.profileInfo,
        token
      });
    } catch (error) {
      return ApiResponse.serverError(null, 'Registration failed', error);
    }
  }

  /**
   * Login user
   * @param {Object} loginData - Login credentials
   * @returns {Object} - Login result
   */
  async login(loginData) {
    try {
      const User = require('../models/User');
      
      // Find user by email
      const user = await User.findByEmailWithPassword(loginData.email);
      if (!user) {
        return ApiResponse.error(null, 'Invalid credentials', ['Invalid email or password'], HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
      }

      // Check if user is active
      if (user.status !== 'active') {
        return ApiResponse.error(null, 'Account is inactive', ['Account has been deactivated'], HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCOUNT_INACTIVE);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        return ApiResponse.error(null, 'Invalid credentials', ['Invalid email or password'], HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
      }

      // Generate token
      const token = this.generateToken(user);

      return ApiResponse.success(null, 'Login successful', {
        user: user.profileInfo,
        token
      });
    } catch (error) {
      return ApiResponse.serverError(null, 'Login failed', error);
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Verification result
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
      
      // Check if user still exists and is active
      const User = require('../models/User');
      const user = User.findById(decoded.id);
      if (!user) {
        return { valid: false, error: 'User not found', code: ERROR_CODES.USER_NOT_FOUND };
      }

      if (user.status !== 'active') {
        return { valid: false, error: 'Account is inactive', code: ERROR_CODES.ACCOUNT_INACTIVE };
      }

      return { 
        valid: true, 
        user: user.profileInfo,
        decoded 
      };
    } catch (error) {
      let errorCode = ERROR_CODES.TOKEN_INVALID;
      let errorMessage = 'Invalid token';

      if (error.name === 'TokenExpiredError') {
        errorCode = ERROR_CODES.TOKEN_EXPIRED;
        errorMessage = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorCode = ERROR_CODES.TOKEN_MALFORMED;
        errorMessage = 'Invalid token format';
      }

      return { valid: false, error: errorMessage, code: errorCode };
    }
  }

  /**
   * Get user profile
   * @param {number} userId - User ID
   * @returns {Object} - User profile
   */
  async getProfile(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.notFound(null, 'User not found', ERROR_CODES.USER_NOT_FOUND);
      }

      return ApiResponse.success(null, 'Profile retrieved successfully', user.profileInfo);
    } catch (error) {
      return ApiResponse.serverError(null, 'Failed to retrieve profile', error);
    }
  }

  /**
   * Get all users (admin only)
   * @returns {Object} - All users
   */
  async getAllUsers() {
    try {
      const User = require('../models/User');
      const users = await User.find().select('-password');
      return ApiResponse.success(null, 'Users retrieved successfully', { users });
    } catch (error) {
      return ApiResponse.serverError(null, 'Failed to retrieve users', error);
    }
  }

  /**
   * Create demo users
   * @returns {Object} - Demo users creation result
   */
  async createDemoUsers() {
    try {
      const User = require('../models/User');
      const bcrypt = require('bcrypt');
      
      const demoUsers = [
        {
          name: 'Admin User',
          email: 'admin@demo.com',
          password: await bcrypt.hash('admin123', 10),
          role: 'admin',
          status: 'active'
        },
        {
          name: 'Analyst User',
          email: 'analyst@demo.com',
          password: await bcrypt.hash('analyst123', 10),
          role: 'analyst',
          status: 'active'
        },
        {
          name: 'Viewer User',
          email: 'viewer@demo.com',
          password: await bcrypt.hash('viewer123', 10),
          role: 'viewer',
          status: 'active'
        }
      ];

      await User.insertMany(demoUsers);
      
      return ApiResponse.success(null, 'Demo users created successfully', {
        users: [
          { email: 'admin@demo.com', password: 'admin123', role: 'admin' },
          { email: 'analyst@demo.com', password: 'analyst123', role: 'analyst' },
          { email: 'viewer@demo.com', password: 'viewer123', role: 'viewer' }
        ]
      });
    } catch (error) {
      return ApiResponse.serverError(null, 'Failed to create demo users', error);
    }
  }
}

// Export singleton instance
module.exports = new AuthService();
