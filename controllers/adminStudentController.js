const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Notification = require('../models/Notification');
const ClassRequest = require('../models/ClassRequest');

// Get all student registration requests
exports.getStudentRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, grade, search, classId, paymentRole, paymentStatus } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (grade) filter.selectedGrade = grade;
    if (classId) filter.enrolledClasses = classId;
    if (paymentRole) filter.paymentRole = paymentRole;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Add search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter)
      .populate('userId', 'email fullName emailVerified')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category capacity enrolledStudents platform')
      .populate('adminAction.actionBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add calculated fields to enrolled classes
    const studentsWithCalculatedFields = students.map(student => {
      const studentObj = student.toObject();
      if (studentObj.enrolledClasses && studentObj.enrolledClasses.length > 0) {
        studentObj.enrolledClasses = studentObj.enrolledClasses.map(classItem => ({
          ...classItem,
          enrolledCount: classItem.enrolledStudents ? classItem.enrolledStudents.length : 0,
          availableSpots: classItem.capacity - (classItem.enrolledStudents ? classItem.enrolledStudents.length : 0)
        }));
      }
      return studentObj;
    });

    const total = await Student.countDocuments(filter);

    res.json({
      students: studentsWithCalculatedFields,
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
      .populate('enrolledClasses', 'type grade date startTime endTime venue category capacity enrolledStudents platform')
      .populate('adminAction.actionBy', 'fullName email');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Add calculated fields to enrolled classes
    const studentObj = student.toObject();
    if (studentObj.enrolledClasses && studentObj.enrolledClasses.length > 0) {
      studentObj.enrolledClasses = studentObj.enrolledClasses.map(classItem => ({
        ...classItem,
        enrolledCount: classItem.enrolledStudents ? classItem.enrolledStudents.length : 0,
        availableSpots: classItem.capacity - (classItem.enrolledStudents ? classItem.enrolledStudents.length : 0)
      }));
    }

    res.json(studentObj);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Change student status (for approved students back to pending, etc.)
exports.changeStudentStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { status, adminNote } = req.body;

    console.log('Changing student status:', { studentId, status, adminNote });

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const oldStatus = student.status;
    student.status = status;
    student.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || `Status changed from ${oldStatus} to ${status}`
    };

    await student.save();

    // Create notification for student
    try {
      await Notification.createNotification({
        recipient: student.userId,
        type: 'status_change',
        title: 'Registration Status Update',
        message: `Your registration status has been updated to ${status}.`,
        data: {
          studentId: student._id,
          oldStatus: oldStatus,
          newStatus: status,
          adminNote: adminNote
        }
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Continue even if notification fails
    }

    res.json({
      message: `Student status changed from ${oldStatus} to ${status} successfully`,
      student
    });
  } catch (err) {
    console.error('Error in changeStudentStatus:', err);
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

    // Send notification to student before deletion
    await Notification.createNotification({
      recipient: student.userId._id,
      type: 'account_deletion',
      title: 'Student Registration Deleted',
      message: 'Your student registration has been deleted by an administrator. Your account has been reverted to regular user status.',
      data: {
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        deletedBy: req.user.id,
        deletionDate: new Date()
      }
    });

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

    // Delete all class requests for this student
    await ClassRequest.deleteMany({ student: student._id });

    // Update user role back to 'user'
    const user = await User.findById(student.userId._id);
    if (user) {
      user.role = 'user';
      user.studentPassword = undefined;
      await user.save();
    }

    // Delete student record (notification will remain for user to see)
    await Student.findByIdAndDelete(studentId);

    // Auto-trigger cleanup of available spots
    try {
      const { cleanAndResetAvailableSpots } = require('./classController');
      await cleanAndResetAvailableSpots();
      console.log('Auto-cleanup triggered after student deletion');
    } catch (cleanupError) {
      console.error('Error in auto-cleanup after student deletion:', cleanupError);
      // Don't fail the deletion if cleanup fails
    }

    res.json({
      message: 'Student registration deleted successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove student from class
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { studentId, classId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Remove class from student's enrolled classes
    student.enrolledClasses = student.enrolledClasses.filter(
      id => !id.equals(classId)
    );

    // Remove student from class's enrolled students
    classItem.enrolledStudents = classItem.enrolledStudents.filter(
      id => !id.equals(studentId)
    );

    await student.save();
    await classItem.save();

    // Auto-trigger cleanup of available spots
    try {
      const { cleanAndResetAvailableSpots } = require('./classController');
      await cleanAndResetAvailableSpots();
      console.log('Auto-cleanup triggered after removing student from class');
    } catch (cleanupError) {
      console.error('Error in auto-cleanup after removing student from class:', cleanupError);
      // Don't fail the operation if cleanup fails
    }

    res.json({
      message: 'Student removed from class successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Change student's class
exports.changeStudentClass = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { oldClassId, newClassId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const oldClass = await Class.findById(oldClassId);
    const newClass = await Class.findById(newClassId);

    if (!oldClass || !newClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if new class has capacity (account for the student being moved)
    const enrolledCount = newClass.enrolledStudents ? newClass.enrolledStudents.length : 0;
    const isStudentAlreadyInNewClass = newClass.enrolledStudents && newClass.enrolledStudents.some(id => id.equals(studentId));

    // If student is not already in the new class, check if there's space for one more
    if (!isStudentAlreadyInNewClass && enrolledCount >= newClass.capacity) {
      return res.status(400).json({ message: 'New class is at full capacity' });
    }

    // Remove from old class
    student.enrolledClasses = student.enrolledClasses.filter(
      id => !id.equals(oldClassId)
    );
    oldClass.enrolledStudents = oldClass.enrolledStudents.filter(
      id => !id.equals(studentId)
    );

    // Add to new class
    student.enrolledClasses.push(newClassId);
    if (!newClass.enrolledStudents) {
      newClass.enrolledStudents = [];
    }
    newClass.enrolledStudents.push(studentId);

    // Update student's grade to match new class grade (exclude literature-related subjects)
    const newClassGrade = newClass.grade;
    const currentGrade = student.selectedGrade;
    const isLiteratureRelated = /lit|literature|litre/i.test(newClassGrade);

    if (!isLiteratureRelated) {
      student.selectedGrade = newClassGrade;
      console.log(`Updated student grade from ${currentGrade} to ${newClassGrade}`);
    } else {
      console.log(`Skipped grade update for literature-related class: ${newClassGrade}`);
    }

    await student.save();
    await oldClass.save();
    await newClass.save();

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId,
      type: 'general',
      title: 'Class Change Notification',
      message: `You have been moved from ${oldClass.grade} - ${oldClass.category} to ${newClass.grade} - ${newClass.category} class.`,
      data: {
        classId: newClass._id,
        adminNote: 'Class changed by administrator'
      }
    });

    // Auto-trigger cleanup of available spots
    try {
      const { cleanAndResetAvailableSpots } = require('./classController');
      await cleanAndResetAvailableSpots();
      console.log('Auto-cleanup triggered after changing student class');
    } catch (cleanupError) {
      console.error('Error in auto-cleanup after changing student class:', cleanupError);
      // Don't fail the operation if cleanup fails
    }

    res.json({
      message: 'Student class changed successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Send message to student
exports.sendMessageToStudent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { subject, message } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId,
      type: 'admin_message',
      title: subject,
      message: message,
      data: {
        studentId: student._id,
        subject: subject
      }
    });

    res.json({
      message: 'Message sent to student successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available classes for student assignment
exports.getAvailableClassesForAssignment = async (req, res) => {
  try {
    const classes = await Class.find({
      type: 'Normal',
      isActive: true
    }).select('type grade date startTime endTime venue category capacity enrolledStudents');

    // Add available spots to each class
    const classesWithSpots = classes.map(classItem => ({
      ...classItem.toObject(),
      enrolledCount: classItem.enrolledStudents ? classItem.enrolledStudents.length : 0,
      availableSpots: classItem.capacity - (classItem.enrolledStudents ? classItem.enrolledStudents.length : 0)
    }));

    res.json({
      classes: classesWithSpots
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available grades for filtering
exports.getAvailableGrades = async (req, res) => {
  try {
    const grades = await Class.distinct('grade', {
      type: 'Normal',
      isActive: true
    });

    res.json({
      grades: grades.sort()
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update student payment role
exports.updatePaymentRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { paymentRole, adminNote, freeClasses } = req.body;

    const student = await Student.findById(studentId)
      .populate('userId')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Set default admin note if not provided
    const defaultAdminNote = `Payment role updated from ${student.paymentRole} to ${paymentRole}`;

    // Update payment role
    student.paymentRole = paymentRole;

    // Handle free classes
    if (paymentRole === 'Free Card') {
      // Validate that at least one class is selected
      if (!freeClasses || freeClasses.length === 0) {
        return res.status(400).json({
          message: 'At least one class must be selected for Free Card payment role'
        });
      }

      // Validate that selected classes are from student's enrolled classes
      const enrolledClassIds = student.enrolledClasses.map(c => c._id.toString());
      const invalidClasses = freeClasses.filter(id => !enrolledClassIds.includes(id));

      if (invalidClasses.length > 0) {
        return res.status(400).json({
          message: 'Selected classes must be from student\'s enrolled classes'
        });
      }

      // Update free classes
      student.freeClasses = freeClasses;
    } else {
      // If changing to Pay Card, clear free classes
      student.freeClasses = [];
    }

    student.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || defaultAdminNote
    };

    await student.save();

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId._id,
      type: 'payment_role_change',
      title: 'Payment Role Updated',
      message: `Your payment role has been updated to ${paymentRole}.`,
      data: {
        studentId: student._id,
        adminNote: adminNote || defaultAdminNote,
        freeClasses: student.freeClasses
      }
    });

    // Populate the response with free classes
    const populatedStudent = await Student.findById(student._id)
      .populate('userId', 'email fullName emailVerified')
      .populate('enrolledClasses', 'type grade date startTime endTime venue category')
      .populate('freeClasses', 'type grade date startTime endTime venue category')
      .populate('adminAction.actionBy', 'fullName email');

    res.json({
      message: 'Payment role updated successfully',
      student: populatedStudent
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update student payment status
exports.updatePaymentStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId } = req.params;
    const { paymentStatus, adminNote } = req.body;

    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Set default admin note if not provided
    const defaultAdminNote = `Payment status updated from ${student.paymentStatus} to ${paymentStatus}`;

    // Update payment status
    student.paymentStatus = paymentStatus;
    student.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || defaultAdminNote
    };

    await student.save();

    // Create notification for student
    await Notification.createNotification({
      recipient: student.userId._id,
      type: 'payment_status_change',
      title: 'Payment Status Updated',
      message: `Your payment status has been updated to ${paymentStatus}.`,
      data: {
        studentId: student._id,
        adminNote: adminNote || defaultAdminNote
      }
    });

    res.json({
      message: 'Payment status updated successfully',
      student
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};