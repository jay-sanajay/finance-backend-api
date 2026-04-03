const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MongoDB connection setup using CommonJS
 * Connects to MongoDB using process.env.MONGODB_URI
 */

const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/finance-backend';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log(`📍 Connection URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    // MongoDB connection options
   // Connect to MongoDB (modern mongoose doesn't need deprecated options)
const conn = await mongoose.connect(mongoURI);

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    console.log(`⚡ Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Failed!');
    console.error('🔍 Error Details:', error.message);
    
    // Provide helpful error messages
    if (error.name === 'MongooseServerSelectionError') {
      console.error('💡 Possible Solutions:');
      console.error('   1. Check if MongoDB is running');
      console.error('   2. Verify the connection URI is correct');
      console.error('   3. Check network connectivity');
      console.error('   4. Ensure MongoDB credentials are valid');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused - MongoDB may not be running');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Host not found - check MongoDB hostname');
    }
    
    // Exit process with failure
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔌 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Handle process termination
const gracefulShutdown = async () => {
  try {
    console.log('🔄 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

module.exports = connectDB;
