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
  deleteStudentRegistration
} = require('../controllers/adminStudentController');

// Validation rules for admin actions
const adminActionValidation = [
  check('adminNote', 'Admin note must be at least 3 characters').optional().isLength({ min: 3 })
];

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

// @route   PUT /api/admin/students/:studentId/approve
// @desc    Approve student registration
// @access  Private (Admin/Moderator)
router.put('/:studentId/approve', [adminAuth, ...adminActionValidation], approveStudentRegistration);

// @route   PUT /api/admin/students/:studentId/reject
// @desc    Reject student registration
// @access  Private (Admin/Moderator)
router.put('/:studentId/reject', [adminAuth, ...adminActionValidation], rejectStudentRegistration);

// @route   PUT /api/admin/students/approve-all
// @desc    Approve all pending registrations
// @access  Private (Admin/Moderator)
router.put('/approve-all', [adminAuth, ...adminActionValidation], approveAllPending);

// @route   DELETE /api/admin/students/:studentId
// @desc    Delete student registration
// @access  Private (Admin/Moderator)
router.delete('/:studentId', adminAuth, deleteStudentRegistration);

module.exports = router;
