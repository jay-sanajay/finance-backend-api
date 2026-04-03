const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { 
  authenticateToken, 
  authorizeRoles, 
  requireMinimumRole, 
  authorizeSelfOrAdmin,
  hasRole,
  optionalAuth,
  ROLE_HIERARCHY 
} = require('../middleware/auth');

// Initialize demo users
router.get('/setup', (req, res) => {
  authService.createDemoUsers();
  res.json({
    success: true,
    message: 'Demo users created',
    users: [
      { email: 'admin@demo.com', password: 'admin123', role: 'admin' },
      { email: 'analyst@demo.com', password: 'analyst123', role: 'analyst' },
      { email: 'viewer@demo.com', password: 'viewer123', role: 'viewer' }
    ]
  });
});

// Demo endpoint showing role hierarchy
router.get('/role-info', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      roleHierarchy: ROLE_HIERARCHY,
      message: 'Your role level in hierarchy'
    }
  });
});

// Viewer level access (viewer, analyst, admin can access)
router.get('/viewer-content', authenticateToken, authorizeRoles('viewer'), (req, res) => {
  res.json({
    success: true,
    message: 'Content accessible to viewers and above',
    data: { content: 'Basic financial overview' }
  });
});

// Analyst level access (analyst and admin can access)
router.get('/analyst-content', authenticateToken, authorizeRoles('analyst'), (req, res) => {
  res.json({
    success: true,
    message: 'Content accessible to analysts and above',
    data: { content: 'Detailed financial analysis and reports' }
  });
});

// Admin only access
router.get('/admin-content', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin only content',
    data: { content: 'System administration and user management' }
  });
});

// Multiple roles allowed (viewer or admin)
router.get('/mixed-content', authenticateToken, authorizeRoles('viewer', 'admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Content accessible to viewers and admins',
    data: { content: 'Mixed access content' }
  });
});

// Minimum role requirement
router.get('/minimum-analyst', authenticateToken, requireMinimumRole('analyst'), (req, res) => {
  res.json({
    success: true,
    message: 'Content requiring minimum analyst role',
    data: { content: 'Analyst-level features' }
  });
});

// Self or admin access (user can access their own data, admin can access any)
router.get('/user/:id/profile', authenticateToken, authorizeSelfOrAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'User profile (self or admin access)',
    data: { 
      userId: req.params.id,
      requestingUser: req.user,
      profile: `Profile data for user ${req.params.id}`
    }
  });
});

// Specific role check
router.get('/admin-only', authenticateToken, hasRole('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin exclusive content',
    data: { content: 'Super secret admin stuff' }
  });
});

// Optional authentication (works with or without token)
router.get('/public-or-enhanced', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      message: 'Enhanced content for authenticated users',
      data: { 
        user: req.user,
        content: 'Personalized content based on your role'
      }
    });
  } else {
    res.json({
      success: true,
      message: 'Public content',
      data: { content: 'Basic public information' }
    });
  }
});

// Error demonstration endpoints
router.get('/unauthorized-demo', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Unauthorized access demo',
    errors: ['Authentication required'],
    code: 'AUTH_REQUIRED'
  });
});

router.get('/forbidden-demo', authenticateToken, (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Forbidden access demo',
    errors: ['Insufficient permissions'],
    code: 'FORBIDDEN',
    currentRole: req.user.role,
    requiredRole: 'higher'
  });
});

module.exports = router;
