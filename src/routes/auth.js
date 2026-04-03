const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /register - Register new user
router.post('/register', authController.register);

// POST /login - Login user
router.post('/login', authController.login);

// GET /profile - Get current user profile (protected)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
