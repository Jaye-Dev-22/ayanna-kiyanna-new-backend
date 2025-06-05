const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createAssignment,
  getClassAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  togglePublishAssignment,
  submitAssignment,
  updateSubmission,
  getAssignmentSubmissions,
  gradeSubmission,
  getSubmissionById
} = require('../controllers/assignmentController');

// Validation rules
const assignmentValidation = [
  check('title', 'Assignment title is required').not().isEmpty(),
  check('title', 'Assignment title must be less than 200 characters').isLength({ max: 200 }),
  check('description', 'Assignment description is required').not().isEmpty(),
  check('description', 'Assignment description must be less than 2000 characters').isLength({ max: 2000 }),
  check('classId', 'Class ID is required').not().isEmpty(),
  check('classId', 'Invalid class ID').isMongoId(),
  check('tasks').optional().isArray(),
  check('tasks.*.taskDescription', 'Task description must be less than 1000 characters').optional().isLength({ max: 1000 }),
  check('guidelines').optional().isArray(),
  check('guidelines.*.guidelineText', 'Guideline text must be less than 500 characters').optional().isLength({ max: 500 }),
  check('attachments').optional().isArray(),
  check('dueDate', 'Invalid due date').optional().isISO8601()
];

// Validation rules for updating assignments (without classId requirement)
const assignmentUpdateValidation = [
  check('title', 'Assignment title is required').not().isEmpty(),
  check('title', 'Assignment title must be less than 200 characters').isLength({ max: 200 }),
  check('description', 'Assignment description is required').not().isEmpty(),
  check('description', 'Assignment description must be less than 2000 characters').isLength({ max: 2000 }),
  check('tasks').optional().isArray(),
  check('tasks.*.taskDescription', 'Task description must be less than 1000 characters').optional().isLength({ max: 1000 }),
  check('guidelines').optional().isArray(),
  check('guidelines.*.guidelineText', 'Guideline text must be less than 500 characters').optional().isLength({ max: 500 }),
  check('attachments').optional().isArray(),
  check('dueDate', 'Invalid due date').optional().isISO8601()
];

const submissionValidation = [
  check('submissionText', 'Submission text is required').not().isEmpty(),
  check('submissionText', 'Submission text must be less than 5000 characters').isLength({ max: 5000 }),
  check('attachments').optional().isArray(),
  check('attachments', 'Maximum 5 attachments allowed').optional().isArray({ max: 5 })
];

const gradeValidation = [
  check('marks', 'Marks are required').isNumeric(),
  check('marks', 'Marks must be between 0 and 100').isFloat({ min: 0, max: 100 }),
  check('feedback', 'Feedback must be less than 1000 characters').optional().isLength({ max: 1000 })
];

// Assignment Routes

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...assignmentValidation], createAssignment);

// @route   GET /api/assignments/class/:classId
// @desc    Get all assignments for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassAssignments);

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getAssignmentById);

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...assignmentUpdateValidation], updateAssignment);

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteAssignment);

// @route   PUT /api/assignments/:id/publish
// @desc    Publish/Unpublish assignment
// @access  Private (Admin/Moderator)
router.put('/:id/publish', [
  adminAuth,
  check('isPublished', 'Published status is required').isBoolean()
], togglePublishAssignment);

// Submission Routes

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment
// @access  Private (Student)
router.post('/:id/submit', [auth, ...submissionValidation], submitAssignment);

// @route   PUT /api/assignments/:id/submit
// @desc    Update assignment submission
// @access  Private (Student)
router.put('/:id/submit', [auth, ...submissionValidation], updateSubmission);

// @route   GET /api/assignments/:id/submissions
// @desc    Get assignment submissions (Admin)
// @access  Private (Admin/Moderator)
router.get('/:id/submissions', adminAuth, getAssignmentSubmissions);

// @route   PUT /api/assignments/submissions/:submissionId/grade
// @desc    Grade assignment submission
// @access  Private (Admin/Moderator)
router.put('/submissions/:submissionId/grade', [adminAuth, ...gradeValidation], gradeSubmission);

// @route   GET /api/assignments/submissions/:submissionId
// @desc    Get submission by ID
// @access  Private (Admin/Moderator/Student)
router.get('/submissions/:submissionId', auth, getSubmissionById);

module.exports = router;
