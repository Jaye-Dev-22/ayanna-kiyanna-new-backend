const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('fullName', 'Name is required').not().isEmpty(),
    check('password', 'Please enter a password with 6+ characters').isLength({ min: 6 })
  ],
  authController.register
);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// @route   GET api/auth/me
// @desc    Get logged-in user
// @access  Private
router.get('/me', auth, authController.getMe);

// /api/auth/firebase-google
router.post('/firebase-google', authController.firebaseGoogleAuth);

module.exports = router;