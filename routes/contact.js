const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Validation rules for contact form
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
];

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, message } = req.body;

    // Send email notification to admin
    const emailResult = await emailService.sendContactNotificationEmail(
      'ayannakiyannanotify@gmail.com',
      {
        name,
        email,
        message,
        submittedAt: new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    );

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Contact message sent successfully'
      });
    } else {
      console.error('Failed to send contact email:', emailResult.error);
      res.status(500).json({
        success: false,
        message: 'Failed to send contact message. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing contact form'
    });
  }
});

module.exports = router;
