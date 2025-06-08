const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

// Validation rules
const createOrderValidation = [
  body('deliveryType')
    .isIn(['pickup', 'delivery'])
    .withMessage('Invalid delivery type'),
  body('paymentMethod')
    .isIn(['bank_transfer', 'cash_on_pickup'])
    .withMessage('Invalid payment method'),
  body('deliveryInfo.recipientName')
    .if(body('deliveryType').equals('delivery'))
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Recipient name is required for delivery and must be between 1 and 100 characters'),
  body('deliveryInfo.contactNumber')
    .if(body('deliveryType').equals('delivery'))
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Contact number is required for delivery and must be between 10 and 15 characters'),
  body('deliveryInfo.address')
    .if(body('deliveryType').equals('delivery'))
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address is required for delivery and must be between 1 and 500 characters'),
  body('deliveryInfo.district')
    .if(body('deliveryType').equals('delivery'))
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('District is required for delivery'),
  body('paymentReceipts')
    .optional()
    .isArray({ max: 3 })
    .withMessage('Maximum 3 payment receipts allowed'),
  body('paymentReceipts.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid receipt URL'),
  body('paymentReceipts.*.publicId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Receipt public ID is required'),
  body('paymentReceipts.*.name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Receipt name is required'),
  body('paidInPerson')
    .optional()
    .isBoolean()
    .withMessage('paidInPerson must be a boolean value')
];

const updateOrderStatusValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'completed'])
    .withMessage('Invalid order status'),
  body('deliveryStatus')
    .optional()
    .isIn(['not_delivered', 'delivered'])
    .withMessage('Invalid delivery status'),
  body('adminNote')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin note cannot exceed 1000 characters')
];

// User Routes (require authentication)
router.post('/', [auth, ...createOrderValidation], createOrder);
router.get('/my-orders', auth, getUserOrders);
router.get('/:id', auth, getOrderById);

// Admin Routes
router.get('/', adminAuth, getAllOrders);
router.put('/:id/status', [adminAuth, ...updateOrderStatusValidation], updateOrderStatus);

module.exports = router;
