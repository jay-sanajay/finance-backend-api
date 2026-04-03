// Load environment variables first
require('dotenv').config();

const connectDB = require('./src/config/database');
const app = require('./src/app');
const PORT = process.env.PORT || 3000;

// Connect to database before starting server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the server after successful database connection
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();