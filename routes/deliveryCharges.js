const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getAllDeliveryCharges,
  getDeliveryChargeByDistrict,
  createOrUpdateDeliveryCharge,
  updateDeliveryCharge,
  deleteDeliveryCharge,
  getDistricts,
  initializeDeliveryCharges
} = require('../controllers/deliveryChargeController');

// Validation rules
const deliveryChargeValidation = [
  body('district')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('District name must be between 1 and 50 characters'),
  body('charge')
    .isFloat({ min: 0 })
    .withMessage('Delivery charge must be a non-negative number')
];

const updateDeliveryChargeValidation = [
  body('charge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery charge must be a non-negative number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Public Routes
router.get('/', getAllDeliveryCharges);
router.get('/districts', getDistricts);
router.get('/district/:district', getDeliveryChargeByDistrict);

// Admin Routes
router.post('/', [adminAuth, ...deliveryChargeValidation], createOrUpdateDeliveryCharge);
router.put('/:id', [adminAuth, ...updateDeliveryChargeValidation], updateDeliveryCharge);
router.delete('/:id', adminAuth, deleteDeliveryCharge);
router.post('/initialize', adminAuth, initializeDeliveryCharges);

module.exports = router;
