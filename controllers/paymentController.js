const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');

// Helper function to calculate attendance for a student in a specific class and month
const calculateAttendance = async (studentId, classId, year, month) => {
  try {
    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Find all attendance sheets for this class in the specified month
    const attendanceSheets = await Attendance.find({
      classId: classId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    let presentDays = 0;
    const totalClassDays = attendanceSheets.length;

    // Count present days for this student
    attendanceSheets.forEach(sheet => {
      const studentAttendance = sheet.studentAttendance.find(
        attendance => attendance.studentId.toString() === studentId.toString()
      );
      if (studentAttendance && studentAttendance.status === 'Present') {
        presentDays++;
      }
    });

    return { presentDays, totalClassDays };
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return { presentDays: 0, totalClassDays: 0 };
  }
};

// @desc    Get payment status for a student's class in a specific year
// @route   GET /api/payments/student/:classId/:year
// @access  Private (Student)
exports.getStudentPaymentStatus = async (req, res) => {
  try {
    const { classId, year } = req.params;

    // Find student record using user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const studentId = student._id;

    // Student data is already available from the first query
    // No need to fetch again

    // Get class data
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if this class is free for the student
    const isFreeClass = student.freeClasses.includes(classId) || classData.isFreeClass;

    // Get all payments for this student and class in the specified year
    const payments = await Payment.find({
      studentId: studentId,
      classId: classId,
      year: parseInt(year)
    }).sort({ month: 1 });

    // Calculate payment status for each month
    const monthlyStatus = [];
    
    for (let month = 1; month <= 12; month++) {
      const existingPayment = payments.find(p => p.month === month);
      const attendance = await calculateAttendance(studentId, classId, parseInt(year), month);
      
      const monthData = {
        month,
        year: parseInt(year),
        attendance,
        isFreeClass,
        monthlyFee: classData.monthlyFee,
        payment: existingPayment || null,
        requiresPayment: attendance.presentDays >= 2 && !isFreeClass,
        isOverdue: attendance.presentDays >= 2 && !isFreeClass && !existingPayment && month < new Date().getMonth() + 1
      };

      monthlyStatus.push(monthData);
    }

    res.json({
      classData: {
        _id: classData._id,
        grade: classData.grade,
        category: classData.category,
        monthlyFee: classData.monthlyFee,
        isFreeClass: classData.isFreeClass
      },
      monthlyStatus,
      isFreeClass
    });
  } catch (error) {
    console.error('Error getting student payment status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit payment request
// @route   POST /api/payments/submit
// @access  Private (Student)
exports.submitPaymentRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { classId, year, month, amount, receiptUrl, receiptPublicId, additionalNote } = req.body;

    // Find student record using user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const studentId = student._id;

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      studentId,
      classId,
      year,
      month
    });

    if (existingPayment) {
      return res.status(400).json({ message: 'Payment request already exists for this month' });
    }

    // Calculate attendance for validation
    const attendance = await calculateAttendance(studentId, classId, year, month);

    // Create new payment request
    const payment = new Payment({
      studentId,
      classId,
      year,
      month,
      amount,
      receiptUrl,
      receiptPublicId,
      additionalNote,
      attendanceData: attendance
    });

    await payment.save();

    // Populate the payment before sending response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName surname fullName studentId')
      .populate('classId', 'grade category monthlyFee');

    res.status(201).json({
      message: 'Payment request submitted successfully',
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Error submitting payment request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update payment request
// @route   PUT /api/payments/:paymentId
// @access  Private (Student)
exports.updatePaymentRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentId } = req.params;
    const { receiptUrl, receiptPublicId, additionalNote } = req.body;

    // Find student record using user ID
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const studentId = student._id;

    // Find the payment and verify ownership
    const payment = await Payment.findOne({
      _id: paymentId,
      studentId: studentId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    // Only allow updates if payment is pending
    if (payment.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot update payment request that has been processed' });
    }

    // Update payment details
    payment.receiptUrl = receiptUrl;
    payment.receiptPublicId = receiptPublicId;
    payment.additionalNote = additionalNote;

    await payment.save();

    // Populate the payment before sending response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'fullName studentId')
      .populate('classId', 'grade category monthlyFee');

    res.json({
      message: 'Payment request updated successfully',
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Error updating payment request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get payment requests for admin (by class, year, month)
// @route   GET /api/payments/admin/:classId/:year/:month
// @access  Private (Admin/Moderator)
exports.getAdminPaymentRequests = async (req, res) => {
  try {
    const { classId, year, month } = req.params;

    // Get payment requests for the specified class, year, and month
    const paymentRequests = await Payment.find({
      classId,
      year: parseInt(year),
      month: parseInt(month)
    })
    .populate('studentId', 'firstName lastName surname fullName studentId email contactNumber')
    .populate('classId', 'grade category monthlyFee')
    .populate('adminAction.actionBy', 'fullName email')
    .sort({ createdAt: -1 });

    // Get all enrolled students for this class
    const classData = await Class.findById(classId).populate('enrolledStudents', 'firstName lastName surname fullName studentId email contactNumber freeClasses paymentStatus');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Calculate attendance and payment status for all enrolled students
    const studentsWithStatus = await Promise.all(
      classData.enrolledStudents.map(async (student) => {
        const attendance = await calculateAttendance(student._id, classId, parseInt(year), parseInt(month));
        const existingPayment = paymentRequests.find(p => p.studentId._id.toString() === student._id.toString());
        const isFreeClass = student.freeClasses.includes(classId) || classData.isFreeClass;

        return {
          student: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            surname: student.surname,
            fullName: student.fullName,
            studentId: student.studentId,
            email: student.email,
            contactNumber: student.contactNumber,
            paymentStatus: student.paymentStatus
          },
          attendance,
          payment: existingPayment || null,
          isFreeClass,
          requiresPayment: attendance.presentDays >= 2 && !isFreeClass,
          isOverdue: attendance.presentDays >= 2 && !isFreeClass && !existingPayment && parseInt(month) < new Date().getMonth() + 1
        };
      })
    );

    res.json({
      classData: {
        _id: classData._id,
        grade: classData.grade,
        category: classData.category,
        monthlyFee: classData.monthlyFee,
        isFreeClass: classData.isFreeClass
      },
      paymentRequests: paymentRequests.filter(p => p.status === 'Pending'),
      allStudentsStatus: studentsWithStatus,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    console.error('Error getting admin payment requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Process payment request (approve/reject)
// @route   PUT /api/payments/admin/:paymentId/process
// @access  Private (Admin/Moderator)
exports.processPaymentRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentId } = req.params;
    const { action, actionNote } = req.body; // action: 'Approved' or 'Rejected'

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    // Update payment status
    payment.status = action;
    payment.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: actionNote || ''
    };

    await payment.save();

    // Populate the payment before sending response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName surname fullName studentId email')
      .populate('classId', 'grade category monthlyFee')
      .populate('adminAction.actionBy', 'fullName email');

    res.json({
      message: `Payment request ${action.toLowerCase()} successfully`,
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Error processing payment request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk process payment requests
// @route   PUT /api/payments/admin/bulk-process
// @access  Private (Admin/Moderator)
exports.bulkProcessPaymentRequests = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentIds, action, actionNote } = req.body; // action: 'Approved' or 'Rejected'

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ message: 'Payment IDs array is required' });
    }

    // Update all specified payments
    const updateResult = await Payment.updateMany(
      { _id: { $in: paymentIds } },
      {
        status: action,
        'adminAction.actionBy': req.user.id,
        'adminAction.actionDate': new Date(),
        'adminAction.actionNote': actionNote || ''
      }
    );

    res.json({
      message: `${updateResult.modifiedCount} payment requests ${action.toLowerCase()} successfully`,
      modifiedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk processing payment requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all payment requests across all classes for admin dashboard
// @route   GET /api/admin/all-payment-requests
// @access  Private (Admin/Moderator)
exports.getAllPaymentRequests = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, classId, month, year } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (classId) filter.classId = classId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Get all payment requests with pagination
    const paymentRequests = await Payment.find(filter)
      .populate({
        path: 'studentId',
        select: 'firstName lastName surname fullName studentId email',
        options: { virtuals: true }
      })
      .populate({
        path: 'classId',
        select: 'grade category monthlyFee isFreeClass'
      })
      .populate({
        path: 'adminAction.actionBy',
        select: 'fullName email'
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(filter);

    // Transform the data to match frontend expectations
    const transformedRequests = paymentRequests.map(payment => ({
      _id: payment._id,
      student: payment.studentId,
      class: payment.classId,
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
      note: payment.note,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      adminAction: payment.adminAction
    }));

    res.json({
      paymentRequests: transformedRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all payment requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update payment request status (for all payment requests page)
// @route   PUT /api/admin/payment-requests/:paymentId/status
// @access  Private (Admin/Moderator)
exports.updatePaymentRequestStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, adminNote } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or pending' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    // Update payment status
    payment.status = status;
    payment.adminAction = {
      actionBy: req.user.id,
      actionDate: new Date(),
      actionNote: adminNote || `Payment ${status} by admin`
    };

    await payment.save();

    // Populate the payment before sending response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName surname fullName studentId email')
      .populate('classId', 'grade category monthlyFee')
      .populate('adminAction.actionBy', 'fullName email');

    res.json({
      message: `Payment request ${status} successfully`,
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Error updating payment request status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete payment request
// @route   DELETE /api/admin/payment-requests/:paymentId
// @access  Private (Admin/Moderator)
exports.deletePaymentRequest = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    await Payment.findByIdAndDelete(paymentId);

    res.json({
      message: 'Payment request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student's own payment requests
// @route   GET /api/payments/my-requests
// @access  Private (Student)
exports.getMyPaymentRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const paymentRequests = await Payment.find({ studentId })
      .populate('classId', 'grade category monthlyFee')
      .populate('adminAction.actionBy', 'fullName email')
      .sort({ createdAt: -1 });

    // Format the response to match frontend expectations
    const formattedRequests = paymentRequests.map(payment => ({
      _id: payment._id,
      class: {
        grade: payment.classId?.grade,
        category: payment.classId?.category
      },
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
      note: payment.note,
      createdAt: payment.createdAt,
      adminAction: payment.adminAction
    }));

    res.json({
      success: true,
      paymentRequests: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching student payment requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
