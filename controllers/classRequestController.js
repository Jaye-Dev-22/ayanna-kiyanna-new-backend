const { validationResult } = require('express-validator');
const ClassRequest = require('../models/ClassRequest');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// Create a new class enrollment request
exports.createClassRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { classId, reason } = req.body;

    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if student is approved
    if (student.status !== 'Approved') {
      return res.status(400).json({ message: 'Student registration must be approved before requesting class enrollment' });
    }

    // Find class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if class is active and normal type
    if (!classItem.isActive || classItem.type !== 'Normal') {
      return res.status(400).json({ message: 'Class is not available for enrollment' });
    }

    // Check if already enrolled
    if (student.enrolledClasses && student.enrolledClasses.includes(classId)) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    // Check if already has a pending request for this class
    const existingRequest = await ClassRequest.findOne({
      student: student._id,
      class: classId,
      status: 'Pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request for this class' });
    }

    // Create class request
    const classRequest = new ClassRequest({
      student: student._id,
      class: classId,
      reason
    });

    await classRequest.save();

    // Populate the request for response
    await classRequest.populate([
      { path: 'student', select: 'studentId fullName' },
      { path: 'class', select: 'type grade date startTime endTime venue category' }
    ]);

    res.status(201).json({
      message: 'Class enrollment request submitted successfully',
      request: classRequest
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get student's class requests
exports.getStudentClassRequests = async (req, res) => {
  try {
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

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

// Get all class requests (Admin)
exports.getAllClassRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, grade } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;

    let requests = await ClassRequest.find(filter)
      .populate({
        path: 'student',
        select: 'studentId firstName lastName selectedGrade email',
        options: { virtuals: true }
      })
      .populate('class', 'type grade date startTime endTime venue category')
      .populate('adminResponse.actionBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by grade if specified
    if (grade) {
      requests = requests.filter(request => request.class.grade === grade);
    }

    const total = await ClassRequest.countDocuments(filter);

    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Approve class request (Admin)
exports.approveClassRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const classRequest = await ClassRequest.findById(requestId)
      .populate({
        path: 'student',
        options: { virtuals: true }
      })
      .populate('class');

    if (!classRequest) {
      return res.status(404).json({ message: 'Class request not found' });
    }

    if (classRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Class request is not pending' });
    }

    // Check class capacity
    const enrolledCount = classRequest.class.enrolledStudents ? classRequest.class.enrolledStudents.length : 0;
    if (enrolledCount >= classRequest.class.capacity) {
      return res.status(400).json({ message: 'Class is at full capacity' });
    }

    // Update request status
    classRequest.status = 'Approved';
    classRequest.adminResponse = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || 'Request approved'
    };

    await classRequest.save();

    // Add student to class and class to student
    if (!classRequest.class.enrolledStudents) {
      classRequest.class.enrolledStudents = [];
    }
    classRequest.class.enrolledStudents.push(classRequest.student._id);

    if (!classRequest.student.enrolledClasses) {
      classRequest.student.enrolledClasses = [];
    }
    classRequest.student.enrolledClasses.push(classRequest.class._id);

    await classRequest.class.save();
    await classRequest.student.save();

    // Create notification for student
    await Notification.createNotification({
      recipient: classRequest.student.userId,
      type: 'class_request_approved',
      title: 'Class Enrollment Request Approved! 🎉',
      message: `Your request to join ${classRequest.class.grade} - ${classRequest.class.category} class has been approved.`,
      data: {
        classRequestId: classRequest._id,
        classId: classRequest.class._id,
        adminNote: adminNote
      }
    });

    res.json({
      message: 'Class request approved successfully',
      request: classRequest
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reject class request (Admin)
exports.rejectClassRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const classRequest = await ClassRequest.findById(requestId)
      .populate({
        path: 'student',
        options: { virtuals: true }
      })
      .populate('class');

    if (!classRequest) {
      return res.status(404).json({ message: 'Class request not found' });
    }

    if (classRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Class request is not pending' });
    }

    // Update request status
    classRequest.status = 'Rejected';
    classRequest.adminResponse = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || 'Request rejected'
    };

    await classRequest.save();

    // Create notification for student
    await Notification.createNotification({
      recipient: classRequest.student.userId,
      type: 'class_request_rejected',
      title: 'Class Enrollment Request Update',
      message: `Your request to join ${classRequest.class.grade} - ${classRequest.class.category} class has been reviewed. Please contact administration for more information.`,
      data: {
        classRequestId: classRequest._id,
        classId: classRequest.class._id,
        adminNote: adminNote
      }
    });

    res.json({
      message: 'Class request rejected',
      request: classRequest
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = exports;
