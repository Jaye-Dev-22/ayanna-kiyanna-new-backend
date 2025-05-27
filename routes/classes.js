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
  removeStudent
} = require('../controllers/classController');

// Validation rules for class creation/update
const classValidation = [
  check('type', 'Type is required and must be Normal or Special')
    .isIn(['Normal', 'Special']),
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
    .isLength({ max: 500 })
];

// @route   GET /api/classes
// @desc    Get all classes with optional filtering
// @access  Private (Admin/Moderator)
router.get('/', adminAuth, getAllClasses);

// @route   GET /api/classes/grades
// @desc    Get available grades for dropdown
// @access  Private (Admin/Moderator)
router.get('/grades', adminAuth, getAvailableGrades);

// @route   GET /api/classes/venues
// @desc    Get available venues for dropdown
// @access  Private (Admin/Moderator)
router.get('/venues', adminAuth, getAvailableVenues);

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private (Admin/Moderator)
router.get('/:id', adminAuth, getClassById);

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

module.exports = router;
