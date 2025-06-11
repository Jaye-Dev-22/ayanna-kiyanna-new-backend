const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const {
  getStudentProfileById,
  updateStudentProfileById,
  updateOwnStudentProfile,
  getStudentProfileForAdminAccess,
  validateAdminAsStudentAccess
} = require('../controllers/studentProfileController');

// Validation rules for student profile update
const studentProfileUpdateValidation = [
  check('surname', 'Surname is required').optional().not().isEmpty(),
  check('firstName', 'First name is required').optional().not().isEmpty(),
  check('lastName', 'Last name is required').optional().not().isEmpty(),
  check('contactNumber', 'Contact number is required').optional().not().isEmpty(),
  check('whatsappNumber', 'WhatsApp number is required').optional().not().isEmpty(),
  check('address', 'Address is required').optional().not().isEmpty(),
  check('school', 'School is required').optional().not().isEmpty(),
  check('gender', 'Gender must be Male, Female, or Other').optional().isIn(['Male', 'Female', 'Other']),
  check('birthday', 'Birthday must be a valid date').optional().isISO8601(),
  check('age', 'Age must be a number').optional().isNumeric(),
  check('guardianName', 'Guardian name is required').optional().not().isEmpty(),
  check('guardianType', 'Guardian type must be Mother, Father, Guardian, or Other').optional().isIn(['Mother', 'Father', 'Guardian', 'Other']),
  check('guardianContact', 'Guardian contact is required').optional().not().isEmpty(),
  check('selectedGrade', 'Selected grade is required').optional().not().isEmpty(),
  check('email', 'Please include a valid email').optional().isEmail()
];

// Admin routes (require admin/moderator role)

// @route   GET /api/student-profile/admin/:studentId
// @desc    Get student profile by ID (Admin access)
// @access  Private (Admin/Moderator)
router.get('/admin/:studentId', adminAuth, getStudentProfileById);

// @route   PUT /api/student-profile/admin/:studentId/update
// @desc    Update student profile by ID (Admin access)
// @access  Private (Admin/Moderator)
router.put('/admin/:studentId/update', [adminAuth, ...studentProfileUpdateValidation], updateStudentProfileById);

// @route   GET /api/student-profile/admin/:studentId/access-context
// @desc    Get student profile with admin-as-student context
// @access  Private (Admin/Moderator)
router.get('/admin/:studentId/access-context', adminAuth, getStudentProfileForAdminAccess);

// @route   GET /api/student-profile/admin/:studentId/validate-class-access/:classId
// @desc    Validate admin-as-student access for specific class
// @access  Private (Admin/Moderator)
router.get('/admin/:studentId/validate-class-access/:classId', adminAuth, validateAdminAsStudentAccess);

// Student routes (require authentication)

// @route   PUT /api/student-profile/update
// @desc    Update own student profile
// @access  Private (Student)
router.put('/update', [auth, ...studentProfileUpdateValidation], updateOwnStudentProfile);

module.exports = router;
