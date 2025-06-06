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
} = require('../controllers/literatureController');

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
    .withMessage('Content must be less than 10000 characters'),
  check('sourceLinks')
    .optional()
    .isArray()
    .withMessage('Source links must be an array')
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
    .withMessage('Content must be less than 10000 characters'),
  check('sourceLinks')
    .optional()
    .isArray()
    .withMessage('Source links must be an array')
];

// Folder Routes

// @route   POST /api/literature/folders
// @desc    Create new literature folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/literature/folders
// @desc    Get all literature folders
// @access  Private
router.get('/folders', auth, getAllFolders);

// @route   GET /api/literature/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/:id', auth, getFolderById);

// @route   PUT /api/literature/folders/:id
// @desc    Update literature folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);

// @route   DELETE /api/literature/folders/:id
// @desc    Delete literature folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes

// @route   POST /api/literature/files
// @desc    Create new literature file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/literature/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/literature/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/literature/files/:id
// @desc    Update literature file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);

// @route   DELETE /api/literature/files/:id
// @desc    Delete literature file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
