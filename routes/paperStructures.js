const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getAllPaperStructures,
  getFilterOptions,
  getPaperStructureById,
  createPaperStructure,
  updatePaperStructure,
  deletePaperStructure
} = require('../controllers/paperStructureController');

// Validation rules
const paperStructureValidation = [
  check('title', 'Title is required').not().isEmpty().trim(),
  check('type', 'Type is required').not().isEmpty(),
  check('type', 'Invalid type').isIn(['Paper Structures', 'අනුමාන', 'Others']),
  check('grade', 'Grade is required').not().isEmpty(),
  check('grade', 'Invalid grade').isIn(['Grade 9', 'Grade 10', 'Grade 11', 'A/L', 'සිංහල සාහිත්‍යය (කාණ්ඩ විෂය)']),
  check('paperPart', 'Paper part is required').not().isEmpty(),
  check('paperPart', 'Invalid paper part').isIn(['Part 1', 'Part 2', 'Part 3', 'Full Paper', 'Other']),
  check('description', 'Description must be a string').optional().isString().trim(),
  check('additionalNote', 'Additional note must be a string').optional().isString().trim()
];

// Public routes (require authentication)

// @route   GET /api/paper-structures
// @desc    Get all paper structures with filtering
// @access  Private
router.get('/', auth, getAllPaperStructures);

// @route   GET /api/paper-structures/filters
// @desc    Get filter options
// @access  Private
router.get('/filters', auth, getFilterOptions);

// @route   GET /api/paper-structures/:id
// @desc    Get paper structure by ID
// @access  Private
router.get('/:id', auth, getPaperStructureById);

// Admin routes (require admin/moderator role)

// @route   POST /api/paper-structures
// @desc    Create new paper structure
// @access  Private (Admin/Moderator)
router.post('/', [adminAuth, ...paperStructureValidation], createPaperStructure);

// @route   PUT /api/paper-structures/:id
// @desc    Update paper structure
// @access  Private (Admin/Moderator)
router.put('/:id', [adminAuth, ...paperStructureValidation], updatePaperStructure);

// @route   DELETE /api/paper-structures/:id
// @desc    Delete paper structure
// @access  Private (Admin/Moderator)
router.delete('/:id', adminAuth, deletePaperStructure);

module.exports = router;
