const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getClassTimeSchedules,
  getTimeScheduleById,
  createTimeSchedule,
  updateTimeSchedule,
  deleteTimeSchedule,
  toggleTaskCompletion,
  getCurrentWeekInfo
} = require('../controllers/timeScheduleController');

// Validation rules
const timeScheduleValidation = [
  check('classId', 'Class ID is required').not().isEmpty(),
  check('year', 'Year is required and must be a valid number')
    .isInt({ min: 2020, max: 2050 }),
  check('month', 'Month is required and must be between 1-12')
    .isInt({ min: 1, max: 12 }),
  check('week', 'Week is required and must be between 1-5')
    .isInt({ min: 1, max: 5 }),
  check('tasks', 'Tasks must be an array').optional().isArray(),
  check('tasks.*.title', 'Task title is required and must be a string')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1-200 characters'),
  check('tasks.*.description', 'Task description must be a string')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Task description must be less than 1000 characters'),
  check('note', 'Note must be a string')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Note must be less than 2000 characters')
];

const timeScheduleUpdateValidation = [
  check('year', 'Year must be a valid number')
    .optional()
    .isInt({ min: 2020, max: 2050 }),
  check('month', 'Month must be between 1-12')
    .optional()
    .isInt({ min: 1, max: 12 }),
  check('week', 'Week must be between 1-5')
    .optional()
    .isInt({ min: 1, max: 5 }),
  check('tasks', 'Tasks must be an array').optional().isArray(),
  check('tasks.*.title', 'Task title is required and must be a string')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1-200 characters'),
  check('tasks.*.description', 'Task description must be a string')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Task description must be less than 1000 characters'),
  check('note', 'Note must be a string')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Note must be less than 2000 characters')
];

// Routes

// @route   GET /api/time-schedules/current-week-info
// @desc    Get current week information
// @access  Private (Admin/Moderator)
router.get('/current-week-info', adminAuth, getCurrentWeekInfo);

// @route   GET /api/time-schedules/class/:classId
// @desc    Get all time schedules for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassTimeSchedules);

// @route   GET /api/time-schedules/:id
// @desc    Get time schedule by ID
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getTimeScheduleById);

// @route   POST /api/time-schedules
// @desc    Create new time schedule
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...timeScheduleValidation], createTimeSchedule);

// @route   PUT /api/time-schedules/:id
// @desc    Update time schedule
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...timeScheduleUpdateValidation], updateTimeSchedule);

// @route   DELETE /api/time-schedules/:id
// @desc    Delete time schedule
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteTimeSchedule);

// @route   PUT /api/time-schedules/:id/tasks/:taskId/toggle
// @desc    Toggle task completion status
// @access  Private (Admin/Moderator)
router.put('/:id/tasks/:taskId/toggle', adminAuth, toggleTaskCompletion);

module.exports = router;
