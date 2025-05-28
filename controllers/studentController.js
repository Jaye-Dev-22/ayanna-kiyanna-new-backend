const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// Register new student
exports.registerStudent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
      details: errors.array().map(err => `${err.param}: ${err.msg}`)
    });
  }

  try {

    const {
      surname,
      firstName,
      lastName,
      contactNumber,
      whatsappNumber,
      email,
      address,
      school,
      gender,
      birthday,
      age,
      currentStudent,
      profilePicture,
      guardianName,
      guardianType,
      guardianContact,
      selectedGrade,
      enrolledClasses,
      studentPassword,
      agreedToTerms
    } = req.body;

    // Check if user exists and has proper role
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a student registration
    const existingStudent = await Student.findOne({ userId: req.user.id });
    if (existingStudent) {
      return res.status(400).json({ message: 'You are already registered as a student' });
    }

    // Calculate age from birthday if not provided
    const birthDate = new Date(birthday);
    const today = new Date();
    let calculatedAge = age || today.getFullYear() - birthDate.getFullYear();

    if (!age) {
      const monthDiff = today.getMonth() - birthDate.getMonth();
      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    // Generate student ID
    const studentId = await Student.generateStudentId(selectedGrade);

    // Create new student first
    const student = new Student({
      surname,
      firstName,
      lastName,
      contactNumber,
      whatsappNumber,
      email,
      address,
      school,
      gender,
      birthday: birthDate,
      age: calculatedAge,
      currentStudent,
      profilePicture,
      guardianName,
      guardianType,
      guardianContact,
      selectedGrade,
      enrolledClasses: enrolledClasses || [],
      studentId,
      studentPassword, // This will be hashed by the Student model pre-save hook
      userId: req.user.id,
      agreedToTerms,
      status: 'Pending'
    });

    await student.save();

    // Update user role to student (store plain password in User model too)
    user.role = 'student';
    user.studentPassword = studentPassword; // This will be hashed by User model pre-save hook
    await user.save();

    // Send simple success response without population to avoid errors
    res.status(201).json({
      message: 'Student registration submitted successfully. Waiting for admin approval.',
      studentId: student.studentId,
      status: student.status
    });
  } catch (err) {
    console.error('Error in student registration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate('userId', 'email fullName')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category platform isActive');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Filter out null/undefined classes and inactive classes
    if (student.enrolledClasses) {
      student.enrolledClasses = student.enrolledClasses.filter(
        classItem => classItem && classItem.isActive !== false
      );
    }

    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Student login with student password
exports.studentLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentPassword } = req.body;

    // Find student by user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Find user to check password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check student password using bcrypt directly
    const isMatch = await bcrypt.compare(studentPassword, user.studentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid student password' });
    }

    // Return student data with safe population
    const populatedStudent = await Student.findById(student._id)
      .populate('userId', 'email fullName')
      .populate({
        path: 'enrolledClasses',
        select: 'type grade date startTime endTime venue category platform isActive'
      });

    // Filter out null/undefined classes and inactive classes
    if (populatedStudent.enrolledClasses) {
      populatedStudent.enrolledClasses = populatedStudent.enrolledClasses.filter(
        classItem => classItem && classItem.isActive !== false
      );
    }

    res.json({
      message: 'Student login successful',
      student: populatedStudent
    });
  } catch (err) {
    console.error('Error in studentLogin:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available classes for enrollment
exports.getAvailableClasses = async (req, res) => {
  try {
    const { grade } = req.query;

    // Build filter for available classes
    const filter = {
      type: 'Normal',
      isActive: true
    };

    if (grade) {
      filter.grade = grade;
    }

    // Get student's enrolled classes to exclude them
    const student = await Student.findOne({ userId: req.user.id });
    if (student && student.enrolledClasses && student.enrolledClasses.length > 0) {
      filter._id = { $nin: student.enrolledClasses };
    }

    const classes = await Class.find(filter)
      .populate({
        path: 'createdBy',
        select: 'fullName email',
        options: { strictPopulate: false }
      })
      .sort({ grade: 1, date: 1, startTime: 1 });

    // Add available spots calculation to each class
    const classesWithSpots = classes.map(classItem => {
      const enrolledCount = classItem.enrolledStudents ? classItem.enrolledStudents.length : 0;
      return {
        ...classItem.toObject(),
        enrolledCount,
        availableSpots: classItem.capacity - enrolledCount
      };
    });

    res.json({
      classes: classesWithSpots || [],
      total: classesWithSpots ? classesWithSpots.length : 0
    });
  } catch (err) {
    console.error('Error in getAvailableClasses:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student's class requests and pending status
exports.getStudentClassRequests = async (req, res) => {
  try {
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const ClassRequest = require('../models/ClassRequest');
    const requests = await ClassRequest.find({ student: student._id })
      .populate('class', 'type grade date startTime endTime venue category')
      .sort({ createdAt: -1 });

    res.json({
      requests
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all grades for filter
exports.getAllGrades = async (_req, res) => {
  try {
    const grades = await Class.distinct('grade', { type: 'Normal', isActive: true });
    res.json({ grades: grades.sort() });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
