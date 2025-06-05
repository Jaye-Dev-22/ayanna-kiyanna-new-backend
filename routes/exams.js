const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createExam,
  getClassExams,
  getExamById,
  updateExam,
  deleteExam,
  assignMarks,
  getExamMarks,
  getExamStudents,
  togglePublishExam
} = require('../controllers/examController');

// Validation rules
const examValidation = [
  check('title', 'Title is required and must be between 1 and 200 characters')
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description is required and must be between 1 and 2000 characters')
    .isLength({ min: 1, max: 2000 }),
  check('classId', 'Class ID is required').not().isEmpty(),
  check('examLink', 'Please enter a valid URL').optional().custom((value) => {
    if (!value || value === '') return true;
    return /^https?:\/\/.+/.test(value);
  }),
  check('examDate', 'Please enter a valid date').optional().isISO8601(),
  check('examStartTime', 'Please enter a valid start time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('examEndTime', 'Please enter a valid end time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('isPublished', 'isPublished must be a boolean').optional().isBoolean()
];

const examUpdateValidation = [
  check('title', 'Title must be between 1 and 200 characters').optional()
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description must be between 1 and 2000 characters').optional()
    .isLength({ min: 1, max: 2000 }),
  check('examLink', 'Please enter a valid URL').optional().custom((value) => {
    if (!value || value === '') return true;
    return /^https?:\/\/.+/.test(value);
  }),
  check('examDate', 'Please enter a valid date').optional().isISO8601(),
  check('examStartTime', 'Please enter a valid start time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('examEndTime', 'Please enter a valid end time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('isPublished', 'isPublished must be a boolean').optional().isBoolean()
];

const marksValidation = [
  check('studentId', 'Student ID is required').not().isEmpty(),
  check('marks', 'Marks must be a number between 0 and 100')
    .isNumeric()
    .isFloat({ min: 0, max: 100 }),
  check('remarks', 'Remarks must not exceed 500 characters').optional()
    .isLength({ max: 500 })
];

// Routes

// @route   POST /api/exams
// @desc    Create new exam
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...examValidation], createExam);

// @route   GET /api/exams/class/:classId
// @desc    Get all exams for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassExams);

// @route   GET /api/exams/:id
// @desc    Get exam by ID
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getExamById);

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...examUpdateValidation], updateExam);

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteExam);

// @route   POST /api/exams/:id/marks
// @desc    Assign marks to student for exam
// @access  Private (Admin/Moderator)
router.post('/:id/marks', [adminAuth, ...marksValidation], assignMarks);

// @route   GET /api/exams/:id/marks
// @desc    Get marks for an exam
// @access  Private (Admin/Moderator/Student)
router.get('/:id/marks', auth, getExamMarks);

// @route   GET /api/exams/:id/students
// @desc    Get enrolled students for exam marks assignment
// @access  Private (Admin/Moderator)
router.get('/:id/students', adminAuth, getExamStudents);

// @route   PUT /api/exams/:id/publish
// @desc    Toggle exam publish status
// @access  Private (Admin/Moderator)
router.put('/:id/publish', adminAuth, togglePublishExam);

module.exports = router;
