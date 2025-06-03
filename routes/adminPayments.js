const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getAllPaymentRequests,
  updatePaymentRequestStatus,
  deletePaymentRequest
} = require('../controllers/paymentController');

// Validation rules
const statusUpdateValidation = [
  check('status', 'Status is required and must be approved, rejected, or pending')
    .isIn(['approved', 'rejected', 'pending']),
  check('adminNote', 'Admin note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

// @route   GET /api/admin/all-payment-requests
// @desc    Get all payment requests across all classes for admin dashboard
// @access  Private (Admin/Moderator)
router.get('/all-payment-requests', adminAuth, getAllPaymentRequests);

// @route   PUT /api/admin/payment-requests/:paymentId/status
// @desc    Update payment request status (for all payment requests page)
// @access  Private (Admin/Moderator)
router.put('/payment-requests/:paymentId/status', [adminAuth, ...statusUpdateValidation], updatePaymentRequestStatus);

// @route   DELETE /api/admin/payment-requests/:paymentId
// @desc    Delete payment request
// @access  Private (Admin/Moderator)
router.delete('/payment-requests/:paymentId', adminAuth, deletePaymentRequest);

module.exports = router;
