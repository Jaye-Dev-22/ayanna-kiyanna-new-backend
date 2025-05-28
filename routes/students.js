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
  requestClassEnrollment,
  getAllGrades
} = require('../controllers/studentController');

// Validation rules for student registration
const studentRegistrationValidation = [
  check('surname', 'Surname is required').not().isEmpty(),
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
  check('contactNumber', 'Contact number is required').not().isEmpty(),
  check('whatsappNumber', 'WhatsApp number is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('address', 'Address is required').not().isEmpty(),
  check('school', 'School is required').not().isEmpty(),
  check('gender', 'Gender is required').isIn(['Male', 'Female', 'Other']),
  check('birthday', 'Birthday is required').isISO8601(),
  check('currentStudent', 'Current student status is required').isIn(['Current Student', 'New Student']),
  check('guardianName', 'Guardian name is required').not().isEmpty(),
  check('guardianType', 'Guardian type is required').isIn(['Mother', 'Father', 'Guardian', 'Other']),
  check('guardianContact', 'Guardian contact is required').not().isEmpty(),
  check('selectedGrade', 'Selected grade is required').not().isEmpty(),
  check('studentPassword', 'Student password must be at least 6 characters').isLength({ min: 6 }),
  check('agreedToTerms', 'You must agree to terms and conditions').equals('true')
];

// Validation rules for student login
const studentLoginValidation = [
  check('studentPassword', 'Student password is required').not().isEmpty()
];

// Validation rules for class enrollment
const classEnrollmentValidation = [
  check('classId', 'Class ID is required').not().isEmpty()
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

// @route   POST /api/students/enroll-class
// @desc    Request enrollment in a class
// @access  Private (Student)
router.post('/enroll-class', [auth, ...classEnrollmentValidation], requestClassEnrollment);

// @route   GET /api/students/grades
// @desc    Get all available grades
// @access  Private (Student)
router.get('/grades', auth, getAllGrades);

module.exports = router;
