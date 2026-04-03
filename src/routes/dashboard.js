const express = require('express');
const router = express.Router();

// Import controllers and middleware
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Main dashboard endpoint - GET /
router.get('/', 
  authenticateToken, 
  dashboardController.getDashboard
);

// Dashboard sub-routes
router.get('/overall-summary', 
  authenticateToken, 
  dashboardController.getOverallSummary
);

router.get('/category-aggregation', 
  authenticateToken, 
  dashboardController.getCategoryAggregation
);

router.get('/recent-transactions', 
  authenticateToken, 
  dashboardController.getRecentTransactions
);

router.get('/monthly-summary', 
  authenticateToken, 
  dashboardController.getMonthlySummary
);

module.exports = router;
