const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const {
  submitFeedback,
  getMyFeedbacks,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  replyToFeedback,
  getUnrepliedFeedbacksCount
} = require('../controllers/feedbackController');

// Validation middleware
const feedbackValidation = [
  body('about').isIn(['Subject Related', 'System Related', 'Classes Related', 'Other']).withMessage('Invalid category'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('attachment.url').optional().notEmpty().withMessage('Attachment URL cannot be empty if provided'),
  body('attachment.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty if provided'),
  body('attachment.type').optional().isIn(['image', 'raw']).withMessage('Invalid attachment type'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array'),
  body('sourceLinks.*.title').optional().trim().isLength({ min: 0, max: 100 }).withMessage('Source link title must be max 100 characters'),
  body('sourceLinks.*.url').optional().trim().isLength({ min: 0 }).withMessage('Source link URL cannot be empty')
];

const feedbackUpdateValidation = [
  body('about').isIn(['Subject Related', 'System Related', 'Classes Related', 'Other']).withMessage('Invalid category'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('attachment.url').optional().notEmpty().withMessage('Attachment URL cannot be empty if provided'),
  body('attachment.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty if provided'),
  body('attachment.type').optional().isIn(['image', 'raw']).withMessage('Invalid attachment type'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array'),
  body('sourceLinks.*.title').optional().trim().isLength({ min: 0, max: 100 }).withMessage('Source link title must be max 100 characters'),
  body('sourceLinks.*.url').optional().trim().isLength({ min: 0 }).withMessage('Source link URL cannot be empty')
];

const replyValidation = [
  body('reply').trim().isLength({ min: 1, max: 2000 }).withMessage('Reply must be between 1 and 2000 characters'),
  body('replyAttachment.url').optional().notEmpty().withMessage('Reply attachment URL cannot be empty if provided'),
  body('replyAttachment.publicId').optional().notEmpty().withMessage('Reply attachment public ID cannot be empty if provided'),
  body('replyAttachment.type').optional().isIn(['image', 'raw']).withMessage('Invalid reply attachment type'),
  body('replySourceLinks').optional().isArray().withMessage('Reply source links must be an array'),
  body('replySourceLinks.*.title').optional().trim().isLength({ min: 0, max: 100 }).withMessage('Reply source link title must be max 100 characters'),
  body('replySourceLinks.*.url').optional().trim().isLength({ min: 0 }).withMessage('Reply source link URL cannot be empty')
];

// User routes (require authentication)

// @route   POST /api/feedback
// @desc    Submit new feedback
// @access  Private
router.post('/', [auth, ...feedbackValidation], submitFeedback);

// @route   GET /api/feedback/my-feedbacks
// @desc    Get user's own feedbacks
// @access  Private
router.get('/my-feedbacks', auth, getMyFeedbacks);

// @route   GET /api/feedback/:id
// @desc    Get feedback by ID
// @access  Private
router.get('/:id', auth, getFeedbackById);

// @route   PUT /api/feedback/:id
// @desc    Update feedback (User can update only if not replied)
// @access  Private
router.put('/:id', [auth, ...feedbackUpdateValidation], updateFeedback);

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (User can delete own if not replied, Admin can delete any)
// @access  Private
router.delete('/:id', auth, deleteFeedback);

// Admin routes (require admin/moderator role)

// @route   GET /api/feedback/admin/all
// @desc    Get all feedbacks (Admin only)
// @access  Private (Admin/Moderator)
router.get('/admin/all', adminAuth, getAllFeedbacks);

// @route   GET /api/feedback/admin/unreplied-count
// @desc    Get unreplied feedbacks count (Admin only)
// @access  Private (Admin/Moderator)
router.get('/admin/unreplied-count', adminAuth, getUnrepliedFeedbacksCount);

// @route   PUT /api/feedback/:id/reply
// @desc    Reply to feedback (Admin only)
// @access  Private (Admin/Moderator)
router.put('/:id/reply', [adminAuth, ...replyValidation], replyToFeedback);

module.exports = router;
