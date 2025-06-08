const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  addRating,
  getProductRatings,
  deleteRating,
  getUserRating
} = require('../controllers/ratingController');

// @route   POST /api/ratings/:productId
// @desc    Add or update a rating for a product
// @access  Private
router.post('/:productId', auth, addRating);

// @route   GET /api/ratings/:productId
// @desc    Get ratings for a product
// @access  Public
router.get('/:productId', getProductRatings);

// @route   GET /api/ratings/:productId/user
// @desc    Get user's rating for a specific product
// @access  Private
router.get('/:productId/user', auth, getUserRating);

// @route   DELETE /api/ratings/:productId
// @desc    Delete user's rating for a product
// @access  Private
router.delete('/:productId', auth, deleteRating);

module.exports = router;
