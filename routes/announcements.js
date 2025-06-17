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
  deleteAnnouncement,
  getClassAnnouncementCount
} = require('../controllers/announcementController');

// Validation rules
const announcementValidation = [
  check('title', 'Title is required and must be between 1 and 200 characters')
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description is required and must be between 1 and 2000 characters')
    .isLength({ min: 1, max: 2000 }),
  check('classId', 'Class ID is required').not().isEmpty(),
  check('priority').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return ['Low', 'Medium', 'High', 'Urgent'].includes(value);
  }).withMessage('Priority must be one of: Low, Medium, High, Urgent'),
  check('attachments', 'Attachments must be an array').optional().isArray(),
  check('expiryDate', 'Please enter a valid date').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return new Date(value).toString() !== 'Invalid Date';
  })
];

const announcementUpdateValidation = [
  check('title', 'Title must be between 1 and 200 characters').optional()
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description must be between 1 and 2000 characters').optional()
    .isLength({ min: 1, max: 2000 }),
  check('priority').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return ['Low', 'Medium', 'High', 'Urgent'].includes(value);
  }).withMessage('Priority must be one of: Low, Medium, High, Urgent'),
  check('attachments', 'Attachments must be an array').optional().isArray(),
  check('isActive', 'isActive must be a boolean').optional().isBoolean(),
  check('expiryDate', 'Please enter a valid date').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return new Date(value).toString() !== 'Invalid Date';
  })
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

// @route   GET /api/announcements/class/:classId/count
// @desc    Get announcement count for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId/count', auth, getClassAnnouncementCount);

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
