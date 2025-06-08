const Product = require('../models/Product');
const User = require('../models/User');

// Add or update a rating for a product
const addRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already rated this product
    const existingRatingIndex = product.ratings.findIndex(
      r => r.user.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      product.ratings[existingRatingIndex].rating = rating;
      product.ratings[existingRatingIndex].review = review || '';
      product.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      // Add new rating
      product.ratings.push({
        user: userId,
        rating,
        review: review || '',
        createdAt: new Date()
      });
    }

    await product.save();

    // Populate user details for response
    await product.populate('ratings.user', 'fullName email');

    res.json({
      message: existingRatingIndex !== -1 ? 'Rating updated successfully' : 'Rating added successfully',
      averageRating: product.averageRating,
      totalRatings: product.totalRatings,
      ratings: product.ratings
    });

  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get ratings for a product
const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const product = await Product.findById(productId)
      .populate('ratings.user', 'fullName email')
      .select('ratings averageRating totalRatings');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Sort ratings by creation date (newest first)
    const sortedRatings = product.ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRatings = sortedRatings.slice(startIndex, endIndex);

    res.json({
      ratings: paginatedRatings,
      averageRating: product.averageRating,
      totalRatings: product.totalRatings,
      currentPage: parseInt(page),
      totalPages: Math.ceil(product.ratings.length / limit),
      hasMore: endIndex < product.ratings.length
    });

  } catch (error) {
    console.error('Error getting ratings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a rating (user can only delete their own rating)
const deleteRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const ratingIndex = product.ratings.findIndex(
      r => r.user.toString() === userId
    );

    if (ratingIndex === -1) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    product.ratings.splice(ratingIndex, 1);
    await product.save();

    res.json({
      message: 'Rating deleted successfully',
      averageRating: product.averageRating,
      totalRatings: product.totalRatings
    });

  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's rating for a specific product
const getUserRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const product = await Product.findById(productId).select('ratings');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const userRating = product.ratings.find(
      r => r.user.toString() === userId
    );

    if (!userRating) {
      return res.json({ userRating: null });
    }

    res.json({ userRating });

  } catch (error) {
    console.error('Error getting user rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addRating,
  getProductRatings,
  deleteRating,
  getUserRating
};
