const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createAttendanceSheet,
  getAttendanceSheet,
  getClassAttendance,
  updateAttendanceSheet,
  updateAttendanceByMonitor,
  deleteAttendanceSheet,
  getAttendanceAnalytics
} = require('../controllers/attendanceController');

// Validation rules for attendance creation
const attendanceValidation = [
  check('classId', 'Class ID is required')
    .not().isEmpty()
    .isMongoId()
    .withMessage('Invalid class ID format'),
  check('expectedPresentCount', 'Expected present count is required and must be a non-negative number')
    .isInt({ min: 0 }),
  check('monitorPermissions.allMonitors', 'All monitors permission must be a boolean')
    .optional()
    .isBoolean(),
  check('monitorPermissions.selectedMonitors', 'Selected monitors must be an array of valid MongoDB IDs')
    .optional()
    .isArray()
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }
      return true;
    }),
  check('notes', 'Notes cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

// Validation rules for attendance update
const attendanceUpdateValidation = [
  check('expectedPresentCount', 'Expected present count must be a non-negative number')
    .optional()
    .isInt({ min: 0 }),
  check('monitorPermissions.allMonitors', 'All monitors permission must be a boolean')
    .optional()
    .isBoolean(),
  check('monitorPermissions.selectedMonitors', 'Selected monitors must be an array of valid MongoDB IDs')
    .optional()
    .isArray()
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }
      return true;
    }),
  check('studentAttendance', 'Student attendance must be an array')
    .optional()
    .isArray(),
  check('studentAttendance.*.studentId', 'Student ID is required and must be valid')
    .optional()
    .isMongoId(),
  check('studentAttendance.*.status', 'Status must be Present or Absent')
    .optional()
    .isIn(['Present', 'Absent']),
  check('notes', 'Notes cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 })
];

// Validation rules for monitor update
const monitorUpdateValidation = [
  check('studentAttendance', 'Student attendance is required and must be an array')
    .isArray()
    .notEmpty(),
  check('studentAttendance.*.studentId', 'Student ID is required and must be valid')
    .isMongoId(),
  check('studentAttendance.*.status', 'Status must be Present or Absent')
    .isIn(['Present', 'Absent'])
];

// @route   POST /api/attendance
// @desc    Create new attendance sheet
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...attendanceValidation], createAttendanceSheet);

// @route   GET /api/attendance/analytics
// @desc    Get attendance analytics for admin dashboard
// @access  Private (Admin/Moderator)
router.get('/analytics', adminAuth, getAttendanceAnalytics);

// @route   GET /api/attendance/class/:classId
// @desc    Get attendance sheets for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassAttendance);

// @route   GET /api/attendance/:id
// @desc    Get single attendance sheet
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getAttendanceSheet);

// @route   PUT /api/attendance/:id
// @desc    Update attendance sheet (Admin only)
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...attendanceUpdateValidation], updateAttendanceSheet);

// @route   PUT /api/attendance/:id/monitor-update
// @desc    Update attendance by monitor
// @access  Private (Student - Monitor only)
router.put('/:id/monitor-update', [auth, ...monitorUpdateValidation], updateAttendanceByMonitor);

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance sheet
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteAttendanceSheet);

module.exports = router;
