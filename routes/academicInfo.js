const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { createFolder, getAllFolders, getFolderById, updateFolder, deleteFolder, createFile, getFolderFiles, getFileById, updateFile, deleteFile } = require('../controllers/academicInfoController');

const folderValidation = [
  check('title').notEmpty().withMessage('Title is required').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  check('description').notEmpty().withMessage('Description is required').isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters')
];

const fileValidation = [
  check('title').notEmpty().withMessage('Title is required').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  check('description').notEmpty().withMessage('Description is required').isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters'),
  check('folder').notEmpty().withMessage('Folder ID is required').isMongoId().withMessage('Invalid folder ID'),
  check('content').optional().isLength({ max: 5000 }).withMessage('Content must not exceed 5000 characters')
];

router.post('/folders', [adminAuth, ...folderValidation], createFolder);
router.get('/folders', auth, getAllFolders);
router.get('/folders/:id', auth, getFolderById);
router.put('/folders/:id', [adminAuth, ...folderValidation], updateFolder);
router.delete('/folders/:id', adminAuth, deleteFolder);
router.post('/files', [adminAuth, ...fileValidation], createFile);
router.get('/folders/:folderId/files', auth, getFolderFiles);
router.get('/files/:id', auth, getFileById);
router.put('/files/:id', [adminAuth, ...fileValidation.slice(0, 4)], updateFile);
router.delete('/files/:id', adminAuth, deleteFile);

module.exports = router;
