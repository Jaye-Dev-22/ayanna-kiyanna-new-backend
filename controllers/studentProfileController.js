const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');

// Get student profile by ID (Admin access)
exports.getStudentProfileById = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student with populated user data and enrolled classes
    const student = await Student.findById(studentId)
      .populate('userId', 'email fullName emailVerified role createdAt')
      .populate({
        path: 'enrolledClasses',
        select: 'type grade date startTime endTime venue category platform isActive capacity enrolledStudents',
        match: { isActive: { $ne: false } } // Only active classes
      })
      .populate('adminAction.actionBy', 'fullName email');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Filter out null/undefined classes
    if (student.enrolledClasses) {
      student.enrolledClasses = student.enrolledClasses.filter(
        classItem => classItem && classItem.isActive !== false
      );
    }

    res.json(student);
  } catch (err) {
    console.error('Error fetching student profile:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update student profile by ID (Admin access)
exports.updateStudentProfileById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.studentId;
    delete updateData.userId;
    delete updateData.paymentRole;
    delete updateData.paymentStatus;
    delete updateData.freeClasses;
    delete updateData.enrolledClasses;
    delete updateData.status;
    delete updateData.createdAt;

    // Update the updatedAt field
    updateData.updatedAt = new Date();

    // If email is being updated, also update it in the User model
    if (updateData.email) {
      const student = await Student.findById(studentId);
      if (student) {
        await User.findByIdAndUpdate(student.userId, { 
          email: updateData.email 
        });
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('userId', 'email fullName emailVerified role')
    .populate({
      path: 'enrolledClasses',
      select: 'type grade date startTime endTime venue category platform isActive',
      match: { isActive: { $ne: false } }
    });

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      message: 'Student profile updated successfully',
      student: updatedStudent
    });
  } catch (err) {
    console.error('Error updating student profile:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update own student profile (Student access)
exports.updateOwnStudentProfile = async (req, res) => {
  try {
    const updateData = req.body;

    // Remove fields that students shouldn't be able to update
    delete updateData._id;
    delete updateData.studentId;
    delete updateData.userId;
    delete updateData.paymentRole;
    delete updateData.paymentStatus;
    delete updateData.freeClasses;
    delete updateData.enrolledClasses;
    delete updateData.status;
    delete updateData.createdAt;
    delete updateData.email; // Students can't change their email

    // Update the updatedAt field
    updateData.updatedAt = new Date();

    const updatedStudent = await Student.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('userId', 'email fullName emailVerified role')
    .populate({
      path: 'enrolledClasses',
      select: 'type grade date startTime endTime venue category platform isActive',
      match: { isActive: { $ne: false } }
    });

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      student: updatedStudent
    });
  } catch (err) {
    console.error('Error updating student profile:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student profile with admin-as-student context
exports.getStudentProfileForAdminAccess = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify admin role
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'moderator')) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Get student data
    const student = await Student.findById(studentId)
      .populate('userId', 'email fullName emailVerified role')
      .populate({
        path: 'enrolledClasses',
        select: 'type grade date startTime endTime venue category platform isActive capacity enrolledStudents',
        match: { isActive: { $ne: false } }
      });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create a context object for admin-as-student access
    const adminContext = {
      originalAdmin: {
        id: adminUser._id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role
      },
      accessingAsStudent: {
        id: student._id,
        studentId: student.studentId,
        userId: student.userId._id,
        fullName: student.fullName,
        email: student.email
      },
      timestamp: new Date()
    };

    res.json({
      student,
      adminContext,
      message: 'Admin access context created successfully'
    });
  } catch (err) {
    console.error('Error creating admin-as-student context:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Validate admin-as-student access for class
exports.validateAdminAsStudentAccess = async (req, res) => {
  try {
    const { studentId, classId } = req.params;

    // Verify admin role
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'moderator')) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Verify student exists and is enrolled in the class
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if student is enrolled in this class
    const isEnrolled = classItem.enrolledStudents.some(
      enrolledStudentId => enrolledStudentId.toString() === student._id.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({ 
        message: 'Student is not enrolled in this class' 
      });
    }

    res.json({
      valid: true,
      message: 'Admin can access this class as the student',
      student: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email
      },
      class: {
        id: classItem._id,
        type: classItem.type,
        grade: classItem.grade,
        venue: classItem.venue
      }
    });
  } catch (err) {
    console.error('Error validating admin-as-student access:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
