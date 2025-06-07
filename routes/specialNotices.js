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
  deleteNotice,
  addQuestion,
  replyToQuestion,
  deleteQuestion,
  getUnansweredQuestionsCount
} = require('../controllers/specialNoticeController');

// Validation middleware
const noticeValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be between 1 and 5000 characters'),
  body('attachment.url').optional().notEmpty().withMessage('Attachment URL cannot be empty if provided'),
  body('attachment.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty if provided'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

const noticeUpdateValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be between 1 and 5000 characters'),
  body('attachment.url').optional().notEmpty().withMessage('Attachment URL cannot be empty if provided'),
  body('attachment.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty if provided'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

// Public routes (require authentication)

// @route   GET /api/special-notices
// @desc    Get all special notices
// @access  Private
router.get('/', auth, getAllNotices);

// @route   GET /api/special-notices/unanswered-count
// @desc    Get unanswered questions count
// @access  Private (Admin/Moderator)
router.get('/unanswered-count', adminAuth, getUnansweredQuestionsCount);

// @route   GET /api/special-notices/:id
// @desc    Get special notice by ID
// @access  Private
router.get('/:id', auth, getNoticeById);

// @route   POST /api/special-notices/:id/questions
// @desc    Add question to notice
// @access  Private
router.post('/:id/questions', auth, addQuestion);

// @route   DELETE /api/special-notices/:noticeId/questions/:questionId
// @desc    Delete question
// @access  Private (User can delete own questions if not replied, Admin can delete any)
router.delete('/:noticeId/questions/:questionId', auth, deleteQuestion);

// Admin routes (require admin/moderator role)

// @route   POST /api/special-notices
// @desc    Create new special notice
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...noticeValidation], createNotice);

// @route   PUT /api/special-notices/:id
// @desc    Update special notice
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...noticeUpdateValidation], updateNotice);

// @route   DELETE /api/special-notices/:id
// @desc    Delete special notice
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteNotice);

// @route   PUT /api/special-notices/:noticeId/questions/:questionId/reply
// @desc    Reply to question
// @access  Private (Admin/Moderator)
router.put('/:noticeId/questions/:questionId/reply', adminAuth, replyToQuestion);

module.exports = router;
