const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  createFile,
  getFolderFiles,
  getFileById,
  updateFile,
  deleteFile,
  toggleLike,
  addComment,
  getFileComments,
  updateComment,
  deleteComment
} = require('../controllers/reviewsController');

// Validation rules
const folderValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters')
];

const fileValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('content').optional().trim().isLength({ max: 10000 }).withMessage('Content must not exceed 10000 characters'),
  body('folderId').isMongoId().withMessage('Valid folder ID is required'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

const fileUpdateValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('content').optional().trim().isLength({ max: 10000 }).withMessage('Content must not exceed 10000 characters'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

const commentValidation = [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
  body('parentComment').optional().isMongoId().withMessage('Valid parent comment ID is required')
];

// Folder Routes
// @route   POST /api/reviews/folders
// @desc    Create new reviews folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/reviews/folders
// @desc    Get all reviews folders
// @access  Private
router.get('/folders', auth, getAllFolders);

// @route   GET /api/reviews/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/:id', auth, getFolderById);

// @route   PUT /api/reviews/folders/:id
// @desc    Update reviews folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);

// @route   DELETE /api/reviews/folders/:id
// @desc    Delete reviews folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes
// @route   POST /api/reviews/files
// @desc    Create new reviews file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/reviews/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/reviews/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/reviews/files/:id
// @desc    Update reviews file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);

// @route   DELETE /api/reviews/files/:id
// @desc    Delete reviews file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

// Like Routes
// @route   POST /api/reviews/files/:id/like
// @desc    Toggle like on a file
// @access  Private
router.post('/files/:id/like', auth, toggleLike);

// Comment Routes
// @route   POST /api/reviews/files/:id/comments
// @desc    Add comment to a file
// @access  Private
router.post('/files/:id/comments', [auth, ...commentValidation], addComment);

// @route   GET /api/reviews/files/:id/comments
// @desc    Get all comments for a file
// @access  Private
router.get('/files/:id/comments', auth, getFileComments);

// @route   PUT /api/reviews/comments/:commentId
// @desc    Update a comment
// @access  Private (Own comment only)
router.put('/comments/:commentId', [auth, ...commentValidation], updateComment);

// @route   DELETE /api/reviews/comments/:commentId
// @desc    Delete a comment
// @access  Private (Own comment or Admin/Moderator)
router.delete('/comments/:commentId', auth, deleteComment);

module.exports = router;
