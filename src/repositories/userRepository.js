import bcrypt from 'bcrypt';

/**
 * User repository - Handles data access operations for users
 */
export class UserRepository {
  constructor() {
    this.users = [];
    this.nextUserId = 1;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} - User object or null
   */
  findByEmail(email) {
    return this.users.find(user => user.email === email) || null;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Object|null} - User object or null
   */
  findById(id) {
    return this.users.find(user => user.id === id) || null;
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {boolean} - True if email exists
   */
  emailExists(email) {
    return this.users.some(user => user.email === email);
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} - Created user
   */
  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser = {
      id: this.nextUserId++,
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'viewer',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);
    return this.sanitizeUser(newUser);
  }

  /**
   * Get all users (without passwords)
   * @returns {Array} - Array of users
   */
  getAll() {
    return this.users.map(user => this.sanitizeUser(user));
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} - Updated user or null
   */
  update(id, updateData) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    const updatedUser = {
      ...this.users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.users[userIndex] = updatedUser;
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {boolean} - True if deleted
   */
  delete(id) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    this.users.splice(userIndex, 1);
    return true;
  }

  /**
   * Verify password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {boolean} - True if password matches
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Sanitize user object (remove password)
   * @param {Object} user - User object
   * @returns {Object} - Sanitized user object
   */
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Clear all users (for testing)
   */
  clear() {
    this.users = [];
    this.nextUserId = 1;
  }

  /**
   * Create demo users
   */
  async createDemoUsers() {
    const demoUsers = [
      { name: 'Admin User', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
      { name: 'Analyst User', email: 'analyst@demo.com', password: 'analyst123', role: 'analyst' },
      { name: 'Viewer User', email: 'viewer@demo.com', password: 'viewer123', role: 'viewer' }
    ];

    for (const userData of demoUsers) {
      if (!this.emailExists(userData.email)) {
        await this.create(userData);
      }
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
