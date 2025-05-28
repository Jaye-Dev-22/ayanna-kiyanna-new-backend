const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createClassRequest,
  getStudentClassRequests,
  getAllClassRequests,
  approveClassRequest,
  rejectClassRequest,
  changeClassRequestStatus,
  approveAllPendingRequests
} = require('../controllers/classRequestController');

// Validation rules
const classRequestValidation = [
  check('classId', 'Class ID is required').not().isEmpty(),
  check('reason', 'Reason must be between 10 and 500 characters').isLength({ min: 10, max: 500 })
];

const adminActionValidation = [
  check('adminNote').optional().custom((value) => {
    if (value && value.trim().length > 0 && value.trim().length < 3) {
      throw new Error('Admin note must be at least 3 characters if provided');
    }
    return true;
  })
];

const statusChangeValidation = [
  check('status', 'Status is required').isIn(['Pending', 'Approved', 'Rejected']),
  check('adminNote').optional().custom((value) => {
    if (value && value.trim().length > 0 && value.trim().length < 3) {
      throw new Error('Admin note must be at least 3 characters if provided');
    }
    return true;
  })
];

// @route   POST /api/class-requests
// @desc    Create new class enrollment request
// @access  Private (Student)
router.post('/', [auth, ...classRequestValidation], createClassRequest);

// @route   GET /api/class-requests/my-requests
// @desc    Get student's class requests
// @access  Private (Student)
router.get('/my-requests', auth, getStudentClassRequests);

// @route   GET /api/class-requests
// @desc    Get all class requests (Admin)
// @access  Private (Admin/Moderator)
router.get('/', adminAuth, getAllClassRequests);

// @route   PUT /api/class-requests/approve-all
// @desc    Approve all pending class requests
// @access  Private (Admin/Moderator)
router.put('/approve-all', [adminAuth, ...adminActionValidation], approveAllPendingRequests);

// @route   PUT /api/class-requests/:requestId/approve
// @desc    Approve class request
// @access  Private (Admin/Moderator)
router.put('/:requestId/approve', [adminAuth, ...adminActionValidation], approveClassRequest);

// @route   PUT /api/class-requests/:requestId/reject
// @desc    Reject class request
// @access  Private (Admin/Moderator)
router.put('/:requestId/reject', [adminAuth, ...adminActionValidation], rejectClassRequest);

// @route   PUT /api/class-requests/:requestId/change-status
// @desc    Change class request status
// @access  Private (Admin/Moderator)
router.put('/:requestId/change-status', [adminAuth, ...statusChangeValidation], changeClassRequestStatus);

module.exports = router;
