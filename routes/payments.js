const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getStudentPaymentStatus,
  submitPaymentRequest,
  updatePaymentRequest,
  getAdminPaymentRequests,
  processPaymentRequest,
  bulkProcessPaymentRequests,
  getAllPaymentRequests,
  updatePaymentRequestStatus
} = require('../controllers/paymentController');

// Validation rules
const paymentSubmissionValidation = [
  check('classId', 'Class ID is required').notEmpty(),
  check('year', 'Year is required and must be a valid number')
    .isInt({ min: 2020, max: 2050 }),
  check('month', 'Month is required and must be between 1-12')
    .isInt({ min: 1, max: 12 }),
  check('amount', 'Amount is required and must be a positive number')
    .isFloat({ min: 0 }),
  check('receiptUrl', 'Receipt URL is required').notEmpty(),
  check('receiptPublicId', 'Receipt public ID is required').notEmpty(),
  check('additionalNote', 'Additional note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

const paymentUpdateValidation = [
  check('receiptUrl', 'Receipt URL is required').notEmpty(),
  check('receiptPublicId', 'Receipt public ID is required').notEmpty(),
  check('additionalNote', 'Additional note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

const paymentProcessValidation = [
  check('action', 'Action is required and must be Approved or Rejected')
    .isIn(['Approved', 'Rejected']),
  check('actionNote', 'Action note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

const bulkProcessValidation = [
  check('paymentIds', 'Payment IDs array is required').isArray({ min: 1 }),
  check('action', 'Action is required and must be Approved or Rejected')
    .isIn(['Approved', 'Rejected']),
  check('actionNote', 'Action note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

const statusUpdateValidation = [
  check('status', 'Status is required and must be approved, rejected, or pending')
    .isIn(['approved', 'rejected', 'pending']),
  check('adminNote', 'Admin note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

// Student routes
// @route   GET /api/payments/student/:classId/:year
// @desc    Get payment status for a student's class in a specific year
// @access  Private (Student)
router.get('/student/:classId/:year', auth, getStudentPaymentStatus);

// @route   POST /api/payments/submit
// @desc    Submit payment request
// @access  Private (Student)
router.post('/submit', [auth, ...paymentSubmissionValidation], submitPaymentRequest);

// @route   PUT /api/payments/:paymentId
// @desc    Update payment request
// @access  Private (Student)
router.put('/:paymentId', [auth, ...paymentUpdateValidation], updatePaymentRequest);

// Admin routes
// @route   GET /api/payments/admin/:classId/:year/:month
// @desc    Get payment requests for admin (by class, year, month)
// @access  Private (Admin/Moderator)
router.get('/admin/:classId/:year/:month', adminAuth, getAdminPaymentRequests);

// @route   PUT /api/payments/admin/:paymentId/process
// @desc    Process payment request (approve/reject)
// @access  Private (Admin/Moderator)
router.put('/admin/:paymentId/process', [adminAuth, ...paymentProcessValidation], processPaymentRequest);

// @route   PUT /api/payments/admin/bulk-process
// @desc    Bulk process payment requests
// @access  Private (Admin/Moderator)
router.put('/admin/bulk-process', [adminAuth, ...bulkProcessValidation], bulkProcessPaymentRequests);

module.exports = router;
