const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// Get all student registration requests
exports.getStudentRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, grade } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (grade) filter.selectedGrade = grade;

    const students = await Student.find(filter)
      .populate('userId', 'email fullName emailVerified')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(filter);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student registration statistics
exports.getStudentStats = async (req, res) => {
  try {
    const stats = await Student.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalStudents = await Student.countDocuments();
    const pendingRequests = await Student.countDocuments({ status: 'Pending' });
    const approvedStudents = await Student.countDocuments({ status: 'Approved' });
    const rejectedStudents = await Student.countDocuments({ status: 'Rejected' });

    res.json({
      total: totalStudents,
      pending: pendingRequests,
      approved: approvedStudents,
      rejected: rejectedStudents,
      stats
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Approve student registration
exports.approveStudentRegistration = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { adminNote } = req.body;

    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.status !== 'Pending') {
      return res.status(400).json({ message: 'Student registration is not pending' });
    }

    // Update student status
    student.status = 'Approved';
    student.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || 'Registration approved'
    };

    await student.save();

    // Add student to enrolled classes
    if (student.enrolledClasses.length > 0) {
      for (const classId of student.enrolledClasses) {
        const classItem = await Class.findById(classId);
        if (classItem && !classItem.enrolledStudents.includes(student._id)) {
          classItem.enrolledStudents.push(student._id);
          await classItem.save();
        }
      }
    }

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId._id,
      type: 'student_registration_approved',
      title: 'Student Registration Approved! 🎉',
      message: `Congratulations! Your student registration has been approved. You can now access your student dashboard and enrolled classes.`,
      data: {
        studentId: student._id,
        adminNote: adminNote
      }
    });

    res.json({
      message: 'Student registration approved successfully',
      student
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reject student registration
exports.rejectStudentRegistration = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { adminNote } = req.body;

    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.status !== 'Pending') {
      return res.status(400).json({ message: 'Student registration is not pending' });
    }

    // Update student status
    student.status = 'Rejected';
    student.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || 'Registration rejected'
    };

    await student.save();

    // Update user role back to 'user'
    const user = await User.findById(student.userId._id);
    if (user) {
      user.role = 'user';
      await user.save();
    }

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId._id,
      type: 'student_registration_rejected',
      title: 'Student Registration Update',
      message: `Your student registration has been reviewed. Please contact administration for more information.`,
      data: {
        studentId: student._id,
        adminNote: adminNote
      }
    });

    res.json({
      message: 'Student registration rejected',
      student
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Approve all pending registrations
exports.approveAllPending = async (req, res) => {
  try {
    const { adminNote } = req.body;

    const pendingStudents = await Student.find({ status: 'Pending' }).populate('userId');

    if (pendingStudents.length === 0) {
      return res.status(400).json({ message: 'No pending registrations found' });
    }

    const approvedCount = pendingStudents.length;

    // Update all pending students
    for (const student of pendingStudents) {
      student.status = 'Approved';
      student.adminAction = {
        actionBy: req.user.id,
        actionDate: new Date(),
        actionNote: adminNote || 'Bulk approval'
      };

      await student.save();

      // Add student to enrolled classes
      if (student.enrolledClasses.length > 0) {
        for (const classId of student.enrolledClasses) {
          const classItem = await Class.findById(classId);
          if (classItem && !classItem.enrolledStudents.includes(student._id)) {
            classItem.enrolledStudents.push(student._id);
            await classItem.save();
          }
        }
      }

      // Create notification for each student
      await Notification.createNotification({
        recipient: student.userId._id,
        type: 'student_registration_approved',
        title: 'Student Registration Approved! 🎉',
        message: `Congratulations! Your student registration has been approved. You can now access your student dashboard and enrolled classes.`,
        data: {
          studentId: student._id,
          adminNote: adminNote
        }
      });
    }

    res.json({
      message: `Successfully approved ${approvedCount} student registrations`,
      approvedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student details by ID
exports.getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate('userId', 'email fullName emailVerified')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category platform')
      .populate('adminAction.actionBy', 'fullName email');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete student registration
exports.deleteStudentRegistration = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from enrolled classes
    if (student.enrolledClasses.length > 0) {
      for (const classId of student.enrolledClasses) {
        const classItem = await Class.findById(classId);
        if (classItem) {
          classItem.enrolledStudents = classItem.enrolledStudents.filter(
            id => !id.equals(student._id)
          );
          await classItem.save();
        }
      }
    }

    // Update user role back to 'user'
    const user = await User.findById(student.userId._id);
    if (user) {
      user.role = 'user';
      user.studentPassword = undefined;
      await user.save();
    }

    // Delete student record
    await Student.findByIdAndDelete(studentId);

    res.json({
      message: 'Student registration deleted successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
