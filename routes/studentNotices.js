const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
} = require('../controllers/studentNoticeController');

// Validation middleware
const noticeValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be between 1 and 5000 characters'),
  body('content2').optional().trim().isLength({ max: 5000 }).withMessage('Content 2 must not exceed 5000 characters'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('attachments.*.url').optional().notEmpty().withMessage('Attachment URL cannot be empty'),
  body('attachments.*.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty'),
  body('attachments.*.type').optional().isIn(['image', 'raw']).withMessage('Invalid attachment type'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array'),
  body('sourceLinks.*').optional().isURL().withMessage('Invalid source link URL')
];

const noticeUpdateValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be between 1 and 5000 characters'),
  body('content2').optional().trim().isLength({ max: 5000 }).withMessage('Content 2 must not exceed 5000 characters'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('attachments.*.url').optional().notEmpty().withMessage('Attachment URL cannot be empty'),
  body('attachments.*.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty'),
  body('attachments.*.type').optional().isIn(['image', 'raw']).withMessage('Invalid attachment type'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array'),
  body('sourceLinks.*').optional().isURL().withMessage('Invalid source link URL')
];

// Public routes (require authentication)

// @route   GET /api/student-notices
// @desc    Get all student notices
// @access  Private
router.get('/', auth, getAllNotices);

// @route   GET /api/student-notices/:id
// @desc    Get student notice by ID
// @access  Private
router.get('/:id', auth, getNoticeById);

// Admin routes (require admin/moderator role)

// @route   POST /api/student-notices
// @desc    Create new student notice
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...noticeValidation], createNotice);

// @route   PUT /api/student-notices/:id
// @desc    Update student notice
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...noticeUpdateValidation], updateNotice);

// @route   DELETE /api/student-notices/:id
// @desc    Delete student notice
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteNotice);

module.exports = router;
