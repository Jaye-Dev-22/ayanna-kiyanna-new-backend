const { validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');
const User = require('../models/User');

// @desc    Create new attendance sheet
// @route   POST /api/attendance
// @access  Private (Admin/Moderator)
const createAttendanceSheet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { classId, expectedPresentCount, monitorPermissions, notes } = req.body;

    // Check if class exists
    const classData = await Class.findById(classId).populate('enrolledStudents');
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if attendance sheet already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      classId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance sheet already exists for today this class. Please update the existing one. or delete it first.'
      });
    }

    // Validate monitor permissions
    if (!monitorPermissions.allMonitors &&
        (!monitorPermissions.selectedMonitors || monitorPermissions.selectedMonitors.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one monitor or choose "Give permission to all monitors"'
      });
    }

    if (monitorPermissions.selectedMonitors && monitorPermissions.selectedMonitors.length > 0) {
      // Check if selected monitors are actually monitors of this class
      const validMonitors = classData.monitors.map(monitor => monitor.toString());
      const invalidMonitors = monitorPermissions.selectedMonitors.filter(
        monitorId => !validMonitors.includes(monitorId)
      );

      if (invalidMonitors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some selected monitors are not monitors of this class'
        });
      }
    }

    // Create student attendance records for all enrolled students
    const studentAttendance = classData.enrolledStudents.map(student => ({
      studentId: student._id,
      status: 'Absent' // Default to absent
    }));

    // Create attendance sheet
    const attendance = new Attendance({
      classId,
      date: new Date(),
      createdBy: req.user.id,
      expectedPresentCount,
      monitorPermissions: {
        allMonitors: monitorPermissions.allMonitors || false,
        selectedMonitors: monitorPermissions.selectedMonitors || []
      },
      studentAttendance,
      notes,
      status: 'Draft'
    });

    // Debug logging for monitor permissions
    console.log('Creating attendance with monitor permissions:', {
      allMonitors: monitorPermissions.allMonitors,
      selectedMonitors: monitorPermissions.selectedMonitors,
      classMonitors: classData.monitors.map(m => m._id.toString())
    });

    await attendance.save();

    // Populate the response
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('classId', 'grade category type venue')
      .populate('createdBy', 'fullName email')
      .populate('studentAttendance.studentId', 'firstName lastName studentId profilePicture')
      .populate('monitorPermissions.selectedMonitors', 'firstName lastName studentId');

    res.status(201).json({
      success: true,
      message: 'Attendance sheet created successfully',
      data: populatedAttendance
    });

  } catch (error) {
    console.error('Error creating attendance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating attendance sheet'
    });
  }
};

// @desc    Get single attendance sheet
// @route   GET /api/attendance/:id
// @access  Private (Admin/Moderator/Student)
const getAttendanceSheet = async (req, res) => {
  try {
    const { id } = req.params;

    // Find attendance sheet
    const attendance = await Attendance.findById(id)
      .populate({
        path: 'classId',
        select: 'grade category type venue monitors enrolledStudents',
        populate: {
          path: 'monitors',
          select: 'firstName lastName studentId'
        }
      })
      .populate('createdBy', 'fullName email')
      .populate('studentAttendance.studentId', 'firstName lastName studentId profilePicture')
      .populate('studentAttendance.markedBy', 'fullName email')
      .populate('monitorPermissions.selectedMonitors', 'firstName lastName studentId')
      .populate('monitorUpdate.updatedBy', 'firstName lastName studentId');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance sheet not found'
      });
    }

    // Get user role and student data if applicable
    const user = await User.findById(req.user.id);
    let studentData = null;

    if (user.role === 'student') {
      studentData = await Student.findOne({ userId: req.user.id });
      if (!studentData) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
    }

    // Filter data based on user role
    let responseData = attendance.toObject();
    if (user.role === 'student' && studentData) {
      // Check if student is a monitor of the class
      const isMonitor = attendance.classId.monitors.some(monitor =>
        monitor._id.toString() === studentData._id.toString()
      );

      if (isMonitor) {
        // Monitors can see full attendance sheet
        responseData = attendance.toObject();
      } else {
        // Regular students can only see their own attendance
        const studentAttendance = attendance.studentAttendance.filter(
          record => record.studentId._id.toString() === studentData._id.toString()
        );

        responseData = {
          ...responseData,
          studentAttendance,
          // Hide sensitive information for regular students
          monitorPermissions: undefined,
          expectedPresentCount: undefined
        };
      }
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching attendance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance sheet'
    });
  }
};

// @desc    Get attendance sheets for a class
// @route   GET /api/attendance/class/:classId
// @access  Private (Admin/Moderator/Student)
const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { month, year } = req.query;

    // Check if class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Build date filter
    let dateFilter = { classId };
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter.date = { $gte: startDate, $lte: endDate };
    }

    // Get user role and student data if applicable
    const user = await User.findById(req.user.id);
    let studentData = null;

    if (user.role === 'student') {
      studentData = await Student.findOne({ userId: req.user.id });
      if (!studentData) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
    }

    // Fetch attendance sheets
    let attendanceSheets = await Attendance.find(dateFilter)
      .populate('classId', 'grade category type venue')
      .populate('createdBy', 'fullName email')
      .populate('studentAttendance.studentId', 'firstName lastName studentId profilePicture')
      .populate('studentAttendance.markedBy', 'fullName email')
      .populate('monitorPermissions.selectedMonitors', 'firstName lastName studentId')
      .populate('monitorUpdate.updatedBy', 'firstName lastName studentId')
      .sort({ date: -1 });

    // Filter data based on user role
    if (user.role === 'student' && studentData) {
      // Check if student is a monitor of the class
      const classData = await Class.findById(classId).populate('monitors');
      const isMonitor = classData.monitors.some(monitor =>
        monitor._id.toString() === studentData._id.toString()
      );

      attendanceSheets = attendanceSheets.map(sheet => {
        if (isMonitor) {
          // Monitors can see full attendance sheets but only for sheets they have permission for
          return sheet.toObject();
        } else {
          // Regular students can only see their own attendance
          const studentAttendance = sheet.studentAttendance.filter(
            record => record.studentId._id.toString() === studentData._id.toString()
          );

          return {
            ...sheet.toObject(),
            studentAttendance,
            // Hide sensitive information for regular students
            monitorPermissions: undefined,
            expectedPresentCount: undefined
          };
        }
      });
    }

    res.json({
      success: true,
      data: attendanceSheets
    });

  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance'
    });
  }
};

// @desc    Update attendance sheet (Admin only)
// @route   PUT /api/attendance/:id
// @access  Private (Admin/Moderator)
const updateAttendanceSheet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { expectedPresentCount, monitorPermissions, studentAttendance, notes } = req.body;

    // Find attendance sheet
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance sheet not found'
      });
    }

    // Update fields
    if (expectedPresentCount !== undefined) {
      attendance.expectedPresentCount = expectedPresentCount;
    }

    if (monitorPermissions) {
      attendance.monitorPermissions = {
        allMonitors: monitorPermissions.allMonitors || false,
        selectedMonitors: monitorPermissions.selectedMonitors || []
      };

      // Debug logging for monitor permissions update
      console.log('Updating attendance with monitor permissions:', {
        attendanceId: attendance._id,
        allMonitors: monitorPermissions.allMonitors,
        selectedMonitors: monitorPermissions.selectedMonitors
      });
    }

    if (studentAttendance) {
      // Update student attendance
      studentAttendance.forEach(update => {
        const existingRecord = attendance.studentAttendance.find(
          record => record.studentId.toString() === update.studentId
        );
        if (existingRecord) {
          existingRecord.status = update.status;
          existingRecord.markedBy = req.user.id;
          existingRecord.markedAt = new Date();
        }
      });
    }

    if (notes !== undefined) {
      attendance.notes = notes;
    }

    attendance.status = 'Completed';
    await attendance.save();

    // Populate the response
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('classId', 'grade category type venue')
      .populate('createdBy', 'fullName email')
      .populate('studentAttendance.studentId', 'firstName lastName studentId profilePicture')
      .populate('studentAttendance.markedBy', 'fullName email')
      .populate('monitorPermissions.selectedMonitors', 'firstName lastName studentId');

    res.json({
      success: true,
      message: 'Attendance sheet updated successfully',
      data: populatedAttendance
    });

  } catch (error) {
    console.error('Error updating attendance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance sheet'
    });
  }
};

// @desc    Update attendance by monitor
// @route   PUT /api/attendance/:id/monitor-update
// @access  Private (Student - Monitor only)
const updateAttendanceByMonitor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { studentAttendance } = req.body;

    // Get monitor's student data
    const monitor = await Student.findOne({ userId: req.user.id });
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor profile not found'
      });
    }

    // Find attendance sheet with class data
    const attendance = await Attendance.findById(id).populate({
      path: 'classId',
      populate: {
        path: 'monitors',
        select: 'firstName lastName studentId'
      }
    });
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance sheet not found'
      });
    }

    // Check if the user is actually a monitor of this class
    const isClassMonitor = attendance.classId.monitors.some(classMonitor =>
      classMonitor._id.toString() === monitor._id.toString()
    );

    if (!isClassMonitor) {
      return res.status(403).json({
        success: false,
        message: 'You are not a monitor of this class'
      });
    }

    // Check if monitor has permission to update
    // Check if monitor update is already locked
    if (attendance.monitorUpdate.isLocked) {
      if (attendance.monitorUpdate.updatedBy &&
          attendance.monitorUpdate.updatedBy.toString() === monitor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You have already updated this attendance sheet. Each monitor can only update once.'
        });
      } else {
        return res.status(403).json({
          success: false,
          message: 'Another monitor has already started to update this attendance sheet or another monitor has updated this attendance sheet'
        });
      }
    }

    // Check if monitor has permission
    let hasPermission = false;
    if (attendance.monitorPermissions.allMonitors) {
      hasPermission = true;
    } else {
      hasPermission = attendance.monitorPermissions.selectedMonitors.some(
        monitorId => monitorId.toString() === monitor._id.toString()
      );
    }

    // Debug logging
    console.log('Monitor permission debug:', {
      monitorId: monitor._id.toString(),
      allMonitors: attendance.monitorPermissions.allMonitors,
      selectedMonitors: attendance.monitorPermissions.selectedMonitors.map(id => id.toString()),
      hasPermission
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this attendance sheet'
      });
    }

    // Update student attendance
    let presentCount = 0;
    studentAttendance.forEach(update => {
      const existingRecord = attendance.studentAttendance.find(
        record => record.studentId.toString() === update.studentId
      );
      if (existingRecord) {
        existingRecord.status = update.status;
        existingRecord.markedBy = req.user.id;
        existingRecord.markedAt = new Date();
        if (update.status === 'Present') {
          presentCount++;
        }
      }
    });

    // Validate present count matches admin's expected count
    if (presentCount !== attendance.expectedPresentCount) {
      return res.status(400).json({
        success: false,
        message: `Present count (${presentCount}) does not match admin's expected count (${attendance.expectedPresentCount}). Please check carefully and correct the attendance sheet.`
      });
    }

    // Lock the attendance for other monitors
    attendance.monitorUpdate.updatedBy = monitor._id;
    attendance.monitorUpdate.updatedAt = new Date();
    attendance.monitorUpdate.markedPresentCount = presentCount;
    attendance.monitorUpdate.isLocked = true;
    attendance.status = 'Updated';
    await attendance.save();

    // Populate the response
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('classId', 'grade category type venue')
      .populate('createdBy', 'fullName email')
      .populate('studentAttendance.studentId', 'firstName lastName studentId profilePicture')
      .populate('studentAttendance.markedBy', 'fullName email')
      .populate('monitorUpdate.updatedBy', 'firstName lastName studentId');

    res.json({
      success: true,
      message: 'Attendance updated successfully by monitor',
      data: populatedAttendance
    });

  } catch (error) {
    console.error('Error updating attendance by monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance'
    });
  }
};

// @desc    Delete attendance sheet
// @route   DELETE /api/attendance/:id
// @access  Private (Admin/Moderator)
const deleteAttendanceSheet = async (req, res) => {
  try {
    const { id } = req.params;

    // Find attendance sheet
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance sheet not found'
      });
    }

    // Delete the attendance sheet
    await Attendance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Attendance sheet deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting attendance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting attendance sheet'
    });
  }
};

// @desc    Get attendance analytics for admin dashboard
// @route   GET /api/attendance/analytics
// @access  Private (Admin/Moderator)
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Get monthly attendance data
    const monthlyData = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(parseInt(year) + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalSheets: { $sum: 1 },
          totalStudents: { $sum: '$totalStudents' },
          totalPresent: { $sum: '$actualPresentCount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get class-wise attendance data
    const classWiseData = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(parseInt(year) + 1, 0, 1)
          }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $unwind: '$classInfo'
      },
      {
        $group: {
          _id: '$classId',
          className: { $first: { $concat: ['$classInfo.grade', ' - ', '$classInfo.category'] } },
          totalSheets: { $sum: 1 },
          averageAttendance: { $avg: '$attendancePercentage' }
        }
      },
      {
        $sort: { averageAttendance: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        monthlyData,
        classWiseData,
        year: parseInt(year)
      }
    });

  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
};

module.exports = {
  createAttendanceSheet,
  getAttendanceSheet,
  getClassAttendance,
  updateAttendanceSheet,
  updateAttendanceByMonitor,
  deleteAttendanceSheet,
  getAttendanceAnalytics
};
