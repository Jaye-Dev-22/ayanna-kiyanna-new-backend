const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const {
  createPhoto,
  getAllPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto
} = require('../controllers/photoBucketController');

// Validation middleware
const photoValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('attachment.url').notEmpty().withMessage('Attachment URL is required'),
  body('attachment.publicId').notEmpty().withMessage('Attachment public ID is required'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

const photoUpdateValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('attachment.url').optional().notEmpty().withMessage('Attachment URL cannot be empty if provided'),
  body('attachment.publicId').optional().notEmpty().withMessage('Attachment public ID cannot be empty if provided'),
  body('sourceLinks').optional().isArray().withMessage('Source links must be an array')
];

// Public routes (require authentication)

// @route   GET /api/photo-bucket
// @desc    Get all photos
// @access  Private
router.get('/', auth, getAllPhotos);

// @route   GET /api/photo-bucket/:id
// @desc    Get photo by ID
// @access  Private
router.get('/:id', auth, getPhotoById);

// Admin routes (require admin/moderator role)

// @route   POST /api/photo-bucket
// @desc    Create new photo
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...photoValidation], createPhoto);

// @route   PUT /api/photo-bucket/:id
// @desc    Update photo
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...photoUpdateValidation], updatePhoto);

// @route   DELETE /api/photo-bucket/:id
// @desc    Delete photo
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deletePhoto);

module.exports = router;
