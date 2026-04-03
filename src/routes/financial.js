const express = require('express');
const router = express.Router();

// Import controllers and middleware
const recordController = require('../controllers/recordController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Test route without authentication for debugging
router.post('/test', recordController.create);
router.get('/test', recordController.getAll);

// CRUD routes with authentication
router.post('/', 
  authenticateToken, 
  authorizeRoles('analyst'), 
  recordController.create
);

router.get('/', 
  authenticateToken, 
  recordController.getAll
);

router.get('/summary', 
  authenticateToken, 
  recordController.getSummary
);

router.get('/categories', 
  authenticateToken, 
  recordController.getCategories
);

router.get('/category-breakdown', 
  authenticateToken, 
  recordController.getCategoryBreakdown
);

router.get('/deleted', 
  authenticateToken, 
  authorizeRoles('analyst'), 
  recordController.getDeleted
);

router.post('/sample', 
  authenticateToken, 
  authorizeRoles('admin'), 
  recordController.createSampleRecords
);

router.get('/:id', 
  authenticateToken, 
  recordController.getById
);

router.put('/:id', 
  authenticateToken, 
  authorizeRoles('analyst'), 
  recordController.update
);

router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('analyst'), 
  recordController.delete
);

// Soft delete specific routes
router.post('/:id/restore', 
  authenticateToken, 
  authorizeRoles('analyst'), 
  recordController.restore
);

router.delete('/:id/hard', 
  authenticateToken, 
  authorizeRoles('admin'), 
  recordController.hardDelete
);

module.exports = router;
