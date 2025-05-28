const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import middlewares
const auth = require('../middleware/auth');

// Import controllers
const {
  registerStudent,
  getStudentProfile,
  studentLogin,
  getAvailableClasses,
  getStudentClassRequests,
  getAllGrades
} = require('../controllers/studentController');

// Validation rules for student registration
const studentRegistrationValidation = [
  check('surname', 'Surname is required').not().isEmpty().trim(),
  check('firstName', 'First name is required').not().isEmpty().trim(),
  check('lastName', 'Last name is required').not().isEmpty().trim(),
  check('contactNumber', 'Contact number is required').not().isEmpty().trim(),
  check('whatsappNumber', 'WhatsApp number is required').not().isEmpty().trim(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('address', 'Address is required').not().isEmpty().trim(),
  check('school', 'School is required').not().isEmpty().trim(),
  check('gender', 'Gender is required').isIn(['Male', 'Female', 'Other']),
  check('birthday', 'Birthday is required').isISO8601().toDate(),
  check('currentStudent', 'Current student status is required').isIn(['Current Student', 'New Student']),
  check('guardianName', 'Guardian name is required').not().isEmpty().trim(),
  check('guardianType', 'Guardian type is required').isIn(['Mother', 'Father', 'Guardian', 'Other']),
  check('guardianContact', 'Guardian contact is required').not().isEmpty().trim(),
  check('selectedGrade', 'Selected grade is required').not().isEmpty().trim(),
  check('studentPassword', 'Student password must be at least 6 characters').isLength({ min: 6 }),
  check('agreedToTerms', 'You must agree to terms and conditions').custom((value) => {
    if (value === true || value === 'true') {
      return true;
    }
    throw new Error('You must agree to terms and conditions');
  }),
  // Optional fields
  check('profilePicture').optional().isURL(),
  check('enrolledClasses').optional().isArray(),
  check('age').optional().isInt({ min: 1, max: 100 })
];

// Validation rules for student login
const studentLoginValidation = [
  check('studentPassword', 'Student password is required').not().isEmpty()
];



// @route   POST /api/students/register
// @desc    Register new student
// @access  Private (User)
router.post('/register', [auth, ...studentRegistrationValidation], registerStudent);

// @route   GET /api/students/profile
// @desc    Get student profile
// @access  Private (Student)
router.get('/profile', auth, getStudentProfile);

// @route   POST /api/students/login
// @desc    Student login with student password
// @access  Private (Student)
router.post('/login', [auth, ...studentLoginValidation], studentLogin);

// @route   GET /api/students/available-classes
// @desc    Get available classes for enrollment
// @access  Private (Student)
router.get('/available-classes', auth, getAvailableClasses);

// @route   GET /api/students/class-requests
// @desc    Get student's class requests
// @access  Private (Student)
router.get('/class-requests', auth, getStudentClassRequests);

// @route   GET /api/students/grades
// @desc    Get all available grades
// @access  Private (Student)
router.get('/grades', auth, getAllGrades);

module.exports = router;
