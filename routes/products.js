const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getRelatedProducts
} = require('../controllers/productController');

// Validation rules
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters'),
  body('category')
    .isIn(['Books', 'T-shirts', 'Caps', 'Magazines', 'Others'])
    .withMessage('Invalid category'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('part')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Part cannot exceed 100 characters'),
  body('publisherAuthor')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Publisher/Author cannot exceed 200 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  body('availableQuantity')
    .isInt({ min: 0 })
    .withMessage('Available quantity must be a non-negative integer'),
  body('images')
    .isArray({ min: 1, max: 5 })
    .withMessage('At least 1 and maximum 5 images are required'),
  body('images.*.url')
    .isURL()
    .withMessage('Invalid image URL'),
  body('images.*.publicId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Image public ID is required'),
  body('images.*.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Image name is required')
];

const productUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters'),
  body('category')
    .optional()
    .isIn(['Books', 'T-shirts', 'Caps', 'Magazines', 'Others'])
    .withMessage('Invalid category'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('part')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Part cannot exceed 100 characters'),
  body('publisherAuthor')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Publisher/Author cannot exceed 200 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  body('availableQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available quantity must be a non-negative integer'),
  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images are allowed'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('images.*.publicId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Image public ID is required'),
  body('images.*.name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Image name is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Public Routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

// Admin Routes
router.post('/', [adminAuth, ...productValidation], createProduct);
router.put('/:id', [adminAuth, ...productUpdateValidation], updateProduct);
router.delete('/:id', adminAuth, deleteProduct);

module.exports = router;
