const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createAnnouncement,
  getClassAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

// Validation rules
const announcementValidation = [
  check('title', 'Title is required and must be between 1 and 200 characters')
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description is required and must be between 1 and 2000 characters')
    .isLength({ min: 1, max: 2000 }),
  check('classId', 'Class ID is required').not().isEmpty(),
  check('priority', 'Priority must be one of: Low, Medium, High, Urgent').optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent']),
  check('expiryDate', 'Please enter a valid date').optional().isISO8601()
];

const announcementUpdateValidation = [
  check('title', 'Title must be between 1 and 200 characters').optional()
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description must be between 1 and 2000 characters').optional()
    .isLength({ min: 1, max: 2000 }),
  check('priority', 'Priority must be one of: Low, Medium, High, Urgent').optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent']),
  check('isActive', 'isActive must be a boolean').optional().isBoolean(),
  check('expiryDate', 'Please enter a valid date').optional().isISO8601()
];

// Routes

// @route   POST /api/announcements
// @desc    Create new announcement
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...announcementValidation], createAnnouncement);

// @route   GET /api/announcements/class/:classId
// @desc    Get all announcements for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassAnnouncements);

// @route   GET /api/announcements/:id
// @desc    Get announcement by ID
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getAnnouncementById);

// @route   PUT /api/announcements/:id
// @desc    Update announcement
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...announcementUpdateValidation], updateAnnouncement);

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteAnnouncement);

module.exports = router;
