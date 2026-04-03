import mongoose from 'mongoose';

/**
 * Database configuration and connection management
 */
export class DatabaseConfig {
  constructor() {
    this.mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-backend';
    this.connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      const conn = await mongoose.connect(this.mongoURI, this.connectionOptions);
      
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
      
      // Handle connection events
      this.setupConnectionHandlers();
      
      return conn;
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Disconnect from MongoDB database
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB disconnected');
    } catch (error) {
      console.error('❌ MongoDB Disconnect Error:', error.message);
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    const db = mongoose.connection;

    db.on('error', (error) => {
      console.error('❌ MongoDB Error:', error);
    });

    db.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    db.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Get database connection status
   * @returns {Object} Connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      state: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    };
  }

  /**
   * Clear all collections (for testing)
   * @returns {Promise<void>}
   */
  async clearDatabase() {
    try {
      const collections = mongoose.connection.collections;
      
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
      
      console.log('🗑️ Database cleared');
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
    }
  }

  /**
   * Seed database with initial data
   * @returns {Promise<void>}
   */
  async seedDatabase() {
    try {
      console.log('🌱 Seeding database...');
      
      // Import models
      const { default: User } = await import('../models/User.js');
      const { default: FinancialRecord } = await import('../models/FinancialRecord.js');
      
      // Create demo users
      const demoUsers = [
        {
          name: 'Admin User',
          email: 'admin@demo.com',
          password: 'admin123',
          role: 'admin',
          status: 'active'
        },
        {
          name: 'Analyst User',
          email: 'analyst@demo.com',
          password: 'analyst123',
          role: 'analyst',
          status: 'active'
        },
        {
          name: 'Viewer User',
          email: 'viewer@demo.com',
          password: 'viewer123',
          role: 'viewer',
          status: 'active'
        }
      ];

      for (const userData of demoUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          await User.create(userData);
          console.log(`👤 Created user: ${userData.email}`);
        }
      }

      // Create sample financial records
      const users = await User.find({});
      if (users.length > 0) {
        const sampleRecords = [
          {
            amount: 5000,
            type: 'income',
            category: 'Salary',
            date: '2024-01-15',
            notes: 'Monthly salary',
            userId: users[0]._id
          },
          {
            amount: 1200,
            type: 'expense',
            category: 'Rent',
            date: '2024-01-01',
            notes: 'Monthly rent payment',
            userId: users[0]._id
          },
          {
            amount: 300,
            type: 'expense',
            category: 'Food',
            date: '2024-01-10',
            notes: 'Grocery shopping',
            userId: users[0]._id
          },
          {
            amount: 1500,
            type: 'income',
            category: 'Freelance',
            date: '2024-01-20',
            notes: 'Freelance project payment',
            userId: users[1]._id
          },
          {
            amount: 200,
            type: 'expense',
            category: 'Transportation',
            date: '2024-01-12',
            notes: 'Gas and parking',
            userId: users[1]._id
          }
        ];

        for (const recordData of sampleRecords) {
          await FinancialRecord.create(recordData);
        }
        console.log('💰 Created sample financial records');
      }

      console.log('✅ Database seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding database:', error.message);
    }
  }
}

// Export singleton instance
export const databaseConfig = new DatabaseConfig();
