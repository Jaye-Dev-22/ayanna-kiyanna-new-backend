const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getAvailableGrades,
  getAvailableVenues,
  enrollStudent,
  removeStudent,
  getAvailableStudents,
  cleanAndResetAvailableSpots,
  addMonitor,
  removeMonitor,
  getEnrolledStudents,
  confirmMonitors,
  getNormalClasses,
  getPublicClasses,
  bulkEnrollStudents
} = require('../controllers/classController');

// Validation rules for class creation/update
const classValidation = [
  check('type', 'Type is required and must be Normal or Special')
    .isIn(['Normal', 'Special']),
  check('category', 'Category is required and must be one of: Hall Class, Group Class, Individual Class, Special Class, Other')
    .isIn(['Hall Class', 'Group Class', 'Individual Class', 'Special Class', 'Other']),
  check('locationLink', 'Location link must be a valid URL')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true;
      try {
        new URL(value);
        return true;
      } catch (e) {
        throw new Error('Location link must be a valid URL');
      }
    }),
  check('grade', 'Grade is required')
    .not().isEmpty()
    .trim(),
  check('date', 'Date is required')
    .not().isEmpty()
    .trim(),
  check('startTime', 'Start time is required and must be in HH:MM format')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('endTime', 'End time is required and must be in HH:MM format')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('venue', 'Venue is required')
    .not().isEmpty()
    .trim(),
  check('capacity', 'Capacity must be a number between 1 and 500')
    .isInt({ min: 1, max: 500 }),
  check('specialNote', 'Special note cannot exceed 500 characters')
    .optional()
    .isLength({ max: 500 }),
  // New fee-related validations
  check('isFreeClass', 'isFreeClass must be a boolean')
    .isBoolean(),
  check('monthlyFee', 'Monthly fee must be a non-negative number')
    .isFloat({ min: 0 })
    .custom((value, { req }) => {
      if (req.body.isFreeClass && value !== 0) {
        throw new Error('Monthly fee must be 0 for free classes');
      }
      return true;
    })
];

// @route   GET /api/classes
// @desc    Get all classes with optional filtering
// @access  Private (Admin/Moderator)
router.get('/', adminAuth, getAllClasses);

// @route   GET /api/classes/normal-classes
// @desc    Get all normal category classes for filtering
// @access  Private (Admin/Moderator)
router.get('/normal-classes', adminAuth, getNormalClasses);

// @route   GET /api/classes/public-classes
// @desc    Get all normal active classes for public viewing
// @access  Public
router.get('/public-classes', getPublicClasses);

// @route   GET /api/classes/grades
// @desc    Get available grades for dropdown
// @access  Private (Admin/Moderator)
router.get('/grades', adminAuth, getAvailableGrades);

// @route   GET /api/classes/venues
// @desc    Get available venues for dropdown
// @access  Private (Admin/Moderator)
router.get('/venues', adminAuth, getAvailableVenues);

// @route   GET /api/classes/clean-and-reset-spots
// @desc    Clean and reset available spots - Data integrity check
// @access  Private (Admin/Moderator)
router.post('/clean-and-reset-spots', adminAuth, cleanAndResetAvailableSpots);

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private (Admin/Moderator or Student)
router.get('/:id', auth, getClassById);

// @route   POST /api/classes
// @desc    Create new class
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...classValidation], createClass);

// @route   PUT /api/classes/:id
// @desc    Update class
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...classValidation], updateClass);

// @route   DELETE /api/classes/:id
// @desc    Delete class
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteClass);

// @route   POST /api/classes/:id/enroll
// @desc    Enroll student in class
// @access  Private (Admin/Moderator)
router.post('/:id/enroll', [
  adminAuth,
  check('studentId', 'Student ID is required').not().isEmpty()
], enrollStudent);

// @route   POST /api/classes/:id/remove-student
// @desc    Remove student from class
// @access  Private (Admin/Moderator)
router.post('/:id/remove-student', [
  adminAuth,
  check('studentId', 'Student ID is required').not().isEmpty()
], removeStudent);

// @route   POST /api/classes/:id/add-monitor
// @desc    Add monitor to class
// @access  Private (Admin/Moderator)
router.post('/:id/add-monitor', [
  adminAuth,
  check('studentId', 'Student ID is required').not().isEmpty()
], addMonitor);

// @route   POST /api/classes/:id/remove-monitor
// @desc    Remove monitor from class
// @access  Private (Admin/Moderator)
router.post('/:id/remove-monitor', [
  adminAuth,
  check('studentId', 'Student ID is required').not().isEmpty()
], removeMonitor);

// @route   GET /api/classes/:id/students
// @desc    Get enrolled students for a class (with search)
// @access  Private (Admin/Moderator or Student)
router.get('/:id/students', auth, getEnrolledStudents);

// @route   GET /api/classes/:id/available-students
// @desc    Get available students for enrollment (not already enrolled in this class)
// @access  Private (Admin/Moderator)
router.get('/:id/available-students', adminAuth, getAvailableStudents);

// @route   POST /api/classes/:id/confirm-monitors
// @desc    Confirm monitors - Check if monitor students are currently enrolled in the class
// @access  Private (Admin/Moderator)
router.post('/:id/confirm-monitors', adminAuth, confirmMonitors);

// @route   POST /api/classes/:id/bulk-enroll
// @desc    Bulk enroll multiple students in a class
// @access  Private (Admin/Moderator)
router.post('/:id/bulk-enroll', [
  adminAuth,
  check('studentIds', 'Student IDs array is required').isArray(),
  check('studentIds.*', 'Each student ID must be a valid MongoDB ObjectId').isMongoId()
], bulkEnrollStudents);

module.exports = router;
