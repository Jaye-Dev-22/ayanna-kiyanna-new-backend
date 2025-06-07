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
  deleteFile
} = require('../controllers/swaraController');

// Validation middleware
const folderValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters')
];

const fileValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content must not exceed 10000 characters'),
  body('folderId')
    .isMongoId()
    .withMessage('Valid folder ID is required'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('sourceLinks')
    .optional()
    .isArray()
    .withMessage('Source links must be an array')
];

const fileUpdateValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content must not exceed 10000 characters'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('sourceLinks')
    .optional()
    .isArray()
    .withMessage('Source links must be an array')
];

// Folder Routes

// @route   POST /api/swara/folders
// @desc    Create new swara folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/swara/folders
// @desc    Get all swara folders
// @access  Private
router.get('/folders', auth, getAllFolders);

// @route   GET /api/swara/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/:id', auth, getFolderById);

// @route   PUT /api/swara/folders/:id
// @desc    Update swara folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);

// @route   DELETE /api/swara/folders/:id
// @desc    Delete swara folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes

// @route   POST /api/swara/files
// @desc    Create new swara file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/swara/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/swara/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/swara/files/:id
// @desc    Update swara file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);

// @route   DELETE /api/swara/files/:id
// @desc    Delete swara file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
