const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const {
  submitMessage,
  getMyMessages,
  getAllMessages,
  getUnrepliedCount,
  replyToMessage,
  editReply,
  updateMessage,
  deleteMessage
} = require('../controllers/studentMessageController');

// Validation middleware
const messageValidation = [
  body('about').trim().isLength({ min: 1, max: 200 }).withMessage('About field must be between 1 and 200 characters'),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
  body('attachments').optional().isArray({ max: 5 }).withMessage('Maximum 5 attachments are allowed'),
  body('attachments.*.url').optional().notEmpty().withMessage('Attachment URL cannot be empty'),
  body('attachments.*.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty'),
  body('attachments.*.type').optional().isIn(['image', 'raw']).withMessage('Invalid attachment type'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array'),
  body('sourceLinks.*').optional().custom((value) => {
    if (value && value.trim() !== '' && !value.match(/^https?:\/\/.+/)) {
      throw new Error('Source link must be a valid URL starting with http:// or https://');
    }
    return true;
  })
];

const replyValidation = [
  body('reply').trim().isLength({ min: 1, max: 2000 }).withMessage('Reply must be between 1 and 2000 characters'),
  body('replyAttachments').optional().isArray().withMessage('Reply attachments must be an array'),
  body('replyAttachments.*.url').optional().notEmpty().withMessage('Reply attachment URL cannot be empty'),
  body('replyAttachments.*.publicId').optional().notEmpty().withMessage('Reply attachment public ID cannot be empty'),
  body('replyAttachments.*.type').optional().isIn(['image', 'raw']).withMessage('Invalid reply attachment type'),
  body('replySourceLinks').optional().isArray().withMessage('Reply source links must be an array'),
  body('replySourceLinks.*').optional().custom((value) => {
    if (value && value.trim() !== '' && !value.match(/^https?:\/\/.+/)) {
      throw new Error('Reply source link must be a valid URL starting with http:// or https://');
    }
    return true;
  })
];

// Student routes (require authentication)

// @route   POST /api/student-messages
// @desc    Submit new student message
// @access  Private
router.post('/', [auth, ...messageValidation], submitMessage);

// @route   GET /api/student-messages/my-messages
// @desc    Get user's messages
// @access  Private
router.get('/my-messages', auth, getMyMessages);

// @route   PUT /api/student-messages/:id
// @desc    Update student message
// @access  Private (Message Owner - only if not replied)
router.put('/:id', [auth, ...messageValidation], updateMessage);

// Admin routes (require admin/moderator role)

// @route   GET /api/student-messages/all
// @desc    Get all student messages
// @access  Private (Admin/Moderator)
router.get('/all', adminAuth, getAllMessages);

// @route   GET /api/student-messages/unreplied-count
// @desc    Get unreplied messages count
// @access  Private (Admin/Moderator)
router.get('/unreplied-count', adminAuth, getUnrepliedCount);

// @route   PUT /api/student-messages/:id/reply
// @desc    Reply to student message
// @access  Private (Admin/Moderator)
router.put('/:id/reply', [adminAuth, ...replyValidation], replyToMessage);

// @route   PUT /api/student-messages/:id/edit-reply
// @desc    Edit reply to student message
// @access  Private (Admin/Moderator)
router.put('/:id/edit-reply', [adminAuth, ...replyValidation], editReply);

// @route   DELETE /api/student-messages/:id
// @desc    Delete student message
// @access  Private (Admin/Moderator or Message Owner)
router.delete('/:id', auth, deleteMessage);

module.exports = router;
