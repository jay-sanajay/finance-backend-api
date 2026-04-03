const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const financialRoutes = require('./routes/financial');
const dashboardRoutes = require('./routes/dashboard');

// Import swagger configuration
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

// Import rate limiting middleware
const RateLimiter = require('./middleware/rateLimiter');

const app = express();

// Basic middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply rate limiting middleware
app.use(RateLimiter.generalLimiter);

// Connect routes with proper prefixes
app.use('/api/auth', RateLimiter.authLimiter, authRoutes);
app.use('/api/records', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Swagger documentation route
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Swagger JSON specification endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Backend API is running',
    endpoints: {
      auth: '/api/auth',
      records: '/api/records',
      dashboard: '/api/dashboard',
      documentation: '/api-docs'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
