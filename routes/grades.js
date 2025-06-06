const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createFolder,
  getFoldersByCategory,
  getFolderById,
  updateFolder,
  deleteFolder,
  createFile,
  getFolderFiles,
  getFileById,
  updateFile,
  deleteFile
} = require('../controllers/gradeController');

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
    .withMessage('Description must be less than 1000 characters'),
  check('gradeCategory')
    .notEmpty()
    .withMessage('Grade category is required')
    .isIn(['grade-9', 'grade-10', 'grade-11', 'a-level', 'sinhala-literature'])
    .withMessage('Invalid grade category')
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

// @route   POST /api/grades/folders
// @desc    Create new grade folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/grades/folders/:gradeCategory
// @desc    Get all folders for a grade category
// @access  Private
router.get('/folders/:gradeCategory', auth, getFoldersByCategory);

// @route   GET /api/grades/folders/single/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/single/:id', auth, getFolderById);

// @route   PUT /api/grades/folders/:id
// @desc    Update grade folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation.slice(0, 2)], updateFolder);

// @route   DELETE /api/grades/folders/:id
// @desc    Delete grade folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes

// @route   POST /api/grades/files
// @desc    Create new grade file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/grades/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/grades/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/grades/files/:id
// @desc    Update grade file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileUpdateValidation], updateFile);

// @route   DELETE /api/grades/files/:id
// @desc    Delete grade file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
