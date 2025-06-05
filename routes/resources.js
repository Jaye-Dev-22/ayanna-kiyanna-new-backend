const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  createResource,
  getClassResources,
  getResourceById,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

// Validation rules
const resourceValidation = [
  check('title', 'Title is required and must be between 1 and 200 characters')
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description is required and must be between 1 and 2000 characters')
    .isLength({ min: 1, max: 2000 }),
  check('classId', 'Class ID is required').not().isEmpty()
];

const resourceUpdateValidation = [
  check('title', 'Title must be between 1 and 200 characters').optional()
    .isLength({ min: 1, max: 200 }),
  check('description', 'Description must be between 1 and 2000 characters').optional()
    .isLength({ min: 1, max: 2000 }),
  check('isActive', 'isActive must be a boolean').optional().isBoolean()
];

// Routes

// @route   POST /api/resources
// @desc    Create new resource
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...resourceValidation], createResource);

// @route   GET /api/resources/class/:classId
// @desc    Get all resources for a class
// @access  Private (Admin/Moderator/Student)
router.get('/class/:classId', auth, getClassResources);

// @route   GET /api/resources/:id
// @desc    Get resource by ID
// @access  Private (Admin/Moderator/Student)
router.get('/:id', auth, getResourceById);

// @route   PUT /api/resources/:id
// @desc    Update resource
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...resourceUpdateValidation], updateResource);

// @route   DELETE /api/resources/:id
// @desc    Delete resource
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deleteResource);

module.exports = router;
