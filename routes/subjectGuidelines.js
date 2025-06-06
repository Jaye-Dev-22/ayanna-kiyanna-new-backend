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
} = require('../controllers/subjectGuidelinesController');

// Validation rules
const folderValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters')
];

const fileValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  check('folder')
    .notEmpty()
    .withMessage('Folder ID is required')
    .isMongoId()
    .withMessage('Invalid folder ID'),
  check('content')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Content must not exceed 5000 characters'),
  check('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  check('attachments.*.title')
    .if(check('attachments').exists())
    .notEmpty()
    .withMessage('Attachment title is required'),
  check('attachments.*.url')
    .if(check('attachments').exists())
    .notEmpty()
    .withMessage('Attachment URL is required')
    .isURL()
    .withMessage('Invalid attachment URL'),
  check('attachments.*.publicId')
    .if(check('attachments').exists())
    .notEmpty()
    .withMessage('Attachment public ID is required'),
  check('attachments.*.type')
    .if(check('attachments').exists())
    .isIn(['image', 'pdf'])
    .withMessage('Attachment type must be image or pdf'),
  check('sourceLinks')
    .optional()
    .isArray()
    .withMessage('Source links must be an array'),
  check('sourceLinks.*.title')
    .if(check('sourceLinks').exists())
    .notEmpty()
    .withMessage('Source link title is required'),
  check('sourceLinks.*.url')
    .if(check('sourceLinks').exists())
    .notEmpty()
    .withMessage('Source link URL is required')
    .isURL()
    .withMessage('Invalid source link URL')
];

// Folder Routes

// @route   POST /api/subject-guidelines/folders
// @desc    Create new subject guidelines folder
// @access  Private (Admin/Moderator)
router.post('/folders', [adminAuth, ...folderValidation], createFolder);

// @route   GET /api/subject-guidelines/folders
// @desc    Get all subject guidelines folders
// @access  Private
router.get('/folders', auth, getAllFolders);

// @route   GET /api/subject-guidelines/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/folders/:id', auth, getFolderById);

// @route   PUT /api/subject-guidelines/folders/:id
// @desc    Update subject guidelines folder
// @access  Private (Admin/Moderator)
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);

// @route   DELETE /api/subject-guidelines/folders/:id
// @desc    Delete subject guidelines folder
// @access  Private (Admin/Moderator)
router.delete('/folders/:id', adminAuth, deleteFolder);

// File Routes

// @route   POST /api/subject-guidelines/files
// @desc    Create new subject guidelines file
// @access  Private (Admin/Moderator)
router.post('/files', [adminAuth, ...fileValidation], createFile);

// @route   GET /api/subject-guidelines/folders/:folderId/files
// @desc    Get all files in a folder
// @access  Private
router.get('/folders/:folderId/files', auth, getFolderFiles);

// @route   GET /api/subject-guidelines/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/files/:id', auth, getFileById);

// @route   PUT /api/subject-guidelines/files/:id
// @desc    Update subject guidelines file
// @access  Private (Admin/Moderator)
router.put('/files/:id', [adminAuth, ...fileValidation.slice(0, 4)], updateFile);

// @route   DELETE /api/subject-guidelines/files/:id
// @desc    Delete subject guidelines file
// @access  Private (Admin/Moderator)
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
