const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getProductAnalytics,
  getInventoryStatus
} = require('../controllers/analyticsController');

// @route   GET /api/analytics/products
// @desc    Get product sales analytics
// @access  Private (Admin only)
router.get('/products', auth, adminAuth, getProductAnalytics);

// @route   GET /api/analytics/inventory
// @desc    Get inventory status and analytics
// @access  Private (Admin only)
router.get('/inventory', auth, adminAuth, getInventoryStatus);

module.exports = router;
