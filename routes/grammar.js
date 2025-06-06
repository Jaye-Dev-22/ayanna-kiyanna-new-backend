const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
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
} = require('../controllers/grammarController');

// Validation rules
const folderValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
];

const fileValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  check('folderId')
    .notEmpty()
    .withMessage('Folder ID is required')
    .isMongoId()
    .withMessage('Invalid folder ID'),
  check('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10000 characters')
];

const fileUpdateValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  check('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10000 characters')
];

// Folder Routes

// @route   POST /api/grammar/folders
// @desc    Create new grammar folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/grammar/folders
// @desc    Get all grammar folders
// @access  Private
router.get('/folders', auth, getAllFolders);

// @route   GET /api/grammar/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/:id', auth, getFolderById);

// @route   PUT /api/grammar/folders/:id
// @desc    Update grammar folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);

// @route   DELETE /api/grammar/folders/:id
// @desc    Delete grammar folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes

// @route   POST /api/grammar/files
// @desc    Create new grammar file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/grammar/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/grammar/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/grammar/files/:id
// @desc    Update grammar file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);

// @route   DELETE /api/grammar/files/:id
// @desc    Delete grammar file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
