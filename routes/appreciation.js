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
} = require('../controllers/appreciationController');

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
router.post('/folders', [adminAuth, ...folderValidation], createFolder);
router.get('/folders', auth, getAllFolders);
router.get('/folders/:id', auth, getFolderById);
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes
router.post('/files', [adminAuth, ...fileValidation], createFile);
router.get('/folders/:folderId/files', auth, getFolderFiles);
router.get('/files/:id', auth, getFileById);
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);
router.delete('/files/:id', adminAuth, deleteFile);

// Like Routes
router.post('/files/:id/like', auth, toggleLike);

// Comment Routes
router.post('/files/:id/comments', [auth, ...commentValidation], addComment);
router.get('/files/:id/comments', auth, getFileComments);
router.put('/comments/:commentId', [auth, ...commentValidation], updateComment);
router.delete('/comments/:commentId', auth, deleteComment);

module.exports = router;
