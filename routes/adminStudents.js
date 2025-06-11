const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getStudentRegistrations,
  getStudentStats,
  approveStudentRegistration,
  rejectStudentRegistration,
  approveAllPending,
  getStudentById,
  deleteStudentRegistration,
  changeStudentStatus,
  removeStudentFromClass,
  changeStudentClass,
  sendMessageToStudent,
  getAvailableClassesForAssignment,
  getAvailableGrades,
  updatePaymentRole,
  updatePaymentStatus
} = require('../controllers/adminStudentController');

// Validation rules for admin actions
const adminActionValidation = [
  check('adminNote', 'Admin note must be at least 3 characters').optional().isLength({ min: 3 })
];

// Validation rules for admin actions (allow empty admin note)
const adminActionValidationOptional = [
  check('adminNote').optional().isLength({ min: 0 })
];

const classChangeValidation = [
  check('oldClassId', 'Old class ID is required').not().isEmpty(),
  check('newClassId', 'New class ID is required').not().isEmpty()
];

const messageValidation = [
  check('subject', 'Subject is required').not().isEmpty().trim(),
  check('message', 'Message is required').not().isEmpty().trim()
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

// @route   GET /api/admin/students/available-classes
// @desc    Get available classes for assignment
// @access  Private (Admin/Moderator)
router.get('/available-classes', adminAuth, getAvailableClassesForAssignment);

// @route   GET /api/admin/students/available-grades
// @desc    Get available grades for filtering
// @access  Private (Admin/Moderator)
router.get('/available-grades', adminAuth, getAvailableGrades);

// @route   PUT /api/admin/students/approve-all
// @desc    Approve all pending registrations
// @access  Private (Admin/Moderator)
router.put('/approve-all', [adminAuth, ...adminActionValidation], approveAllPending);

// @route   GET /api/admin/students
// @desc    Get all student registrations
// @access  Private (Admin/Moderator)
router.get('/', adminAuth, getStudentRegistrations);

// @route   GET /api/admin/students/stats
// @desc    Get student registration statistics
// @access  Private (Admin/Moderator)
router.get('/stats', adminAuth, getStudentStats);

// @route   GET /api/admin/students/:studentId
// @desc    Get student details by ID
// @access  Private (Admin/Moderator)
router.get('/:studentId', adminAuth, getStudentById);

// @route   GET /api/admin/students/:studentId/profile
// @desc    Get complete student profile with user details
// @access  Private (Admin/Moderator)
router.get('/:studentId/profile', adminAuth, getStudentById);

// @route   PUT /api/admin/students/:studentId/approve
// @desc    Approve student registration
// @access  Private (Admin/Moderator)
router.put('/:studentId/approve', [adminAuth, ...adminActionValidationOptional], approveStudentRegistration);

// @route   PUT /api/admin/students/:studentId/reject
// @desc    Reject student registration
// @access  Private (Admin/Moderator)
router.put('/:studentId/reject', [adminAuth, ...adminActionValidationOptional], rejectStudentRegistration);

// @route   PUT /api/admin/students/:studentId/change-status
// @desc    Change student status (approved to pending, etc.)
// @access  Private (Admin/Moderator)
router.put('/:studentId/change-status', [adminAuth, ...statusChangeValidation], changeStudentStatus);

// @route   DELETE /api/admin/students/:studentId
// @desc    Delete student registration
// @access  Private (Admin/Moderator)
router.delete('/:studentId', adminAuth, deleteStudentRegistration);

// @route   DELETE /api/admin/students/:studentId/classes/:classId
// @desc    Remove student from class
// @access  Private (Admin/Moderator)
router.delete('/:studentId/classes/:classId', adminAuth, removeStudentFromClass);

// @route   PUT /api/admin/students/:studentId/change-class
// @desc    Change student's class
// @access  Private (Admin/Moderator)
router.put('/:studentId/change-class', [adminAuth, ...classChangeValidation], changeStudentClass);

// @route   POST /api/admin/students/:studentId/message
// @desc    Send message to student
// @access  Private (Admin/Moderator)
router.post('/:studentId/message', [adminAuth, ...messageValidation], sendMessageToStudent);

// @route   PUT /api/admin/students/:studentId/payment-role
// @desc    Update student payment role
// @access  Private (Admin/Moderator)
router.put(
  '/:studentId/payment-role',
  [
    adminAuth,
    check('paymentRole', 'Payment role is required').isIn(['Pay Card', 'Free Card']),
    check('adminNote', 'Admin note is required').not().isEmpty()
  ],
  updatePaymentRole
);

// @route   PUT /api/admin/students/:studentId/payment-status
// @desc    Update student payment status
// @access  Private (Admin/Moderator)
router.put(
  '/:studentId/payment-status',
  [
    adminAuth,
    check('paymentStatus', 'Payment status is required').isIn(['admissioned', 'Paid', 'Unpaid']),
    check('adminNote', 'Admin note is required').not().isEmpty()
  ],
  updatePaymentStatus
);

module.exports = router;
