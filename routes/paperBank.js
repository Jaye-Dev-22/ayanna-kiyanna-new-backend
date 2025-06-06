const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getAllPapers,
  getPaperById,
  createPaper,
  updatePaper,
  deletePaper,
  getFilterOptions
} = require('../controllers/paperBankController');

// Validation rules
const paperValidation = [
  check('title', 'Title is required').not().isEmpty().trim(),
  check('grade', 'Grade is required').not().isEmpty(),
  check('grade', 'Invalid grade').isIn(['Grade 9', 'Grade 10', 'Grade 11', 'A/L']),
  check('paperType', 'Paper type is required').not().isEmpty(),
  check('paperType', 'Invalid paper type').isIn(['Past Paper', 'Model Paper', 'Other']),
  check('paperYear', 'Paper year is required').not().isEmpty().trim(),
  check('paperPart', 'Paper part is required').not().isEmpty(),
  check('paperPart', 'Invalid paper part').isIn(['Part 1', 'Part 2', 'Part 3', 'Full Paper', 'Other']),
  check('description', 'Description must be a string').optional().isString().trim(),
  check('attachments', 'Attachments must be an array').optional().isArray(),
  check('sourceLinks', 'Source links must be an array').optional().isArray()
];

// Public routes (require authentication)

// @route   GET /api/paperbank
// @desc    Get all papers with filtering
// @access  Private
router.get('/', auth, getAllPapers);

// @route   GET /api/paperbank/filters
// @desc    Get filter options
// @access  Private
router.get('/filters', auth, getFilterOptions);

// @route   GET /api/paperbank/:id
// @desc    Get paper by ID
// @access  Private
router.get('/:id', auth, getPaperById);

// Admin routes (require admin/moderator role)

// @route   POST /api/paperbank
// @desc    Create new paper
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...paperValidation], createPaper);

// @route   PUT /api/paperbank/:id
// @desc    Update paper
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...paperValidation], updatePaper);

// @route   DELETE /api/paperbank/:id
// @desc    Delete paper (soft delete)
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deletePaper);

module.exports = router;
