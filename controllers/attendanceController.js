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

    // Check if attendance sheet already exists for today (same date, regardless of time)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log('Date check debug:', {
      now: now.toISOString(),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      classId
    });

    const existingAttendance = await Attendance.findOne({
      classId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (existingAttendance) {
      console.log('Found existing attendance:', {
        id: existingAttendance._id,
        date: existingAttendance.date.toISOString(),
        classId: existingAttendance.classId
      });
    }

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance sheet already exists for today this class. Please update the existing one. or delete it first.'
      });
    }

    // Validate monitor permissions (skip validation if adminOnly is selected)
    if (!monitorPermissions.adminOnly &&
        !monitorPermissions.allMonitors &&
        (!monitorPermissions.selectedMonitors || monitorPermissions.selectedMonitors.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one monitor or choose "Give permission to all monitors"'
      });
    }

    // Check if "Give permission to all monitors" is selected but class has no monitors
    if (monitorPermissions.allMonitors && (!classData.monitors || classData.monitors.length === 0)) {
      console.log('Validation failed: "Give permission to all monitors" selected but class has no monitors', {
        classId,
        className: `${classData.grade} - ${classData.category}`,
        monitorsCount: classData.monitors ? classData.monitors.length : 0,
        allMonitors: monitorPermissions.allMonitors
      });

      return res.status(400).json({
        success: false,
        message: 'මෙම පන්තියට නිරීක්ෂකයින් නොමැත. කරුණාකර පළමුව නිරීක්ෂකයින් එක් කරන්න හෝ "මට පමණක් අවසර ලැබෙමි" තෝරන්න.',
        messageEn: 'This class has no monitors. Please add monitors first or select "Admin Only" permission.'
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
      date: todayStart, // Use the start of today to ensure consistent date comparison
      createdBy: req.user.id,
      expectedPresentCount,
      monitorPermissions: {
        allMonitors: monitorPermissions.allMonitors || false,
        selectedMonitors: monitorPermissions.selectedMonitors || [],
        adminOnly: monitorPermissions.adminOnly || false
      },
      studentAttendance,
      notes,
      status: 'Draft'
    });

    // Debug logging for monitor permissions
    console.log('Creating attendance with monitor permissions:', {
      allMonitors: monitorPermissions.allMonitors,
      selectedMonitors: monitorPermissions.selectedMonitors,
      adminOnly: monitorPermissions.adminOnly,
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
    if (user.role === 'student') {
      // Additional safety check for studentData
      if (!studentData) {
        console.error('Student data not found for user:', {
          userId: req.user.id,
          userRole: user.role,
          classId: classId
        });
        return res.status(404).json({
          success: false,
          message: 'Student profile not found. Please contact administrator.'
        });
      }

      // Check if student is a monitor of the class
      const classDataForMonitorCheck = await Class.findById(classId).populate('monitors');
      if (!classDataForMonitorCheck) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      const isMonitor = classDataForMonitorCheck.monitors && classDataForMonitorCheck.monitors.some(monitor =>
        monitor._id.toString() === studentData._id.toString()
      );

      attendanceSheets = attendanceSheets.map(sheet => {
        if (isMonitor) {
          // Monitors can see full attendance sheets but only for sheets they have permission for
          return sheet.toObject();
        } else {
          // Regular students can only see their own attendance
          const studentAttendance = sheet.studentAttendance.filter(
            record => record.studentId && record.studentId._id &&
                     record.studentId._id.toString() === studentData._id.toString()
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
      // If trying to set "Give permission to all monitors", check if class has monitors
      if (monitorPermissions.allMonitors) {
        // Get class data to check monitors
        const classData = await Class.findById(attendance.classId);
        if (!classData) {
          return res.status(404).json({
            success: false,
            message: 'Class not found'
          });
        }

        if (!classData.monitors || classData.monitors.length === 0) {
          console.log('Update validation failed: "Give permission to all monitors" selected but class has no monitors', {
            classId: attendance.classId,
            className: `${classData.grade} - ${classData.category}`,
            monitorsCount: classData.monitors ? classData.monitors.length : 0,
            allMonitors: monitorPermissions.allMonitors
          });

          return res.status(400).json({
            success: false,
            message: 'මෙම පන්තියට නිරීක්ෂකයින් නොමැත. කරුණාකර පළමුව නිරීක්ෂකයින් එක් කරන්න හෝ "මට පමණක් අවසර ලැබෙමි" තෝරන්න.',
            messageEn: 'This class has no monitors. Please add monitors first or select "Admin Only" permission.'
          });
        }
      }

      attendance.monitorPermissions = {
        allMonitors: monitorPermissions.allMonitors || false,
        selectedMonitors: monitorPermissions.selectedMonitors || [],
        adminOnly: monitorPermissions.adminOnly || false
      };

      // Debug logging for monitor permissions update
      console.log('Updating attendance with monitor permissions:', {
        attendanceId: attendance._id,
        allMonitors: monitorPermissions.allMonitors,
        selectedMonitors: monitorPermissions.selectedMonitors,
        adminOnly: monitorPermissions.adminOnly
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

    // Find attendance sheet with class data and populate selectedMonitors
    const attendance = await Attendance.findById(id)
      .populate({
        path: 'classId',
        populate: {
          path: 'monitors',
          select: 'firstName lastName studentId'
        }
      })
      .populate('monitorPermissions.selectedMonitors', 'firstName lastName studentId');
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
    if (attendance.monitorPermissions.adminOnly) {
      // If adminOnly is true, no monitors have permission
      hasPermission = false;
    } else if (attendance.monitorPermissions.allMonitors) {
      hasPermission = true;
    } else {
      hasPermission = attendance.monitorPermissions.selectedMonitors.some(
        selectedMonitor => {
          // Handle both populated and non-populated selectedMonitors
          const selectedMonitorId = selectedMonitor._id ? selectedMonitor._id.toString() : selectedMonitor.toString();
          return selectedMonitorId === monitor._id.toString();
        }
      );
    }

    // Debug logging
    console.log('Monitor permission debug:', {
      monitorId: monitor._id.toString(),
      adminOnly: attendance.monitorPermissions.adminOnly,
      allMonitors: attendance.monitorPermissions.allMonitors,
      selectedMonitors: attendance.monitorPermissions.selectedMonitors.map(monitor => ({
        id: monitor._id ? monitor._id.toString() : monitor.toString(),
        name: monitor.firstName ? `${monitor.firstName} ${monitor.lastName}` : 'Unknown'
      })),
      selectedMonitorIds: attendance.monitorPermissions.selectedMonitors.map(monitor =>
        monitor._id ? monitor._id.toString() : monitor.toString()
      ),
      hasPermission
    });

    if (!hasPermission) {
      const message = attendance.monitorPermissions.adminOnly
        ? 'ඔබට මෙම පත්‍රිකාව යාවත්කාලීන කිරීමට අවසර නැත - පරිපාලක පමණක් අවසර ලබා ඇත'
        : 'You do not have permission to update this attendance sheet';

      return res.status(403).json({
        success: false,
        message
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
        $addFields: {
          // Calculate total students for each sheet
          totalStudentsCount: { $size: { $ifNull: ['$studentAttendance', []] } },
          // Calculate present students for each sheet
          presentStudentsCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$studentAttendance', []] },
                cond: { $eq: ['$$this.status', 'Present'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalSheets: { $sum: 1 },
          totalStudents: { $sum: '$totalStudentsCount' },
          totalPresent: { $sum: '$presentStudentsCount' }
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
        $addFields: {
          // Calculate total students for each sheet
          totalStudentsCount: { $size: { $ifNull: ['$studentAttendance', []] } },
          // Calculate present students for each sheet
          presentStudentsCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$studentAttendance', []] },
                cond: { $eq: ['$$this.status', 'Present'] }
              }
            }
          },
          // Calculate attendance percentage for each sheet
          attendancePercentage: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$studentAttendance', []] } }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: { $ifNull: ['$studentAttendance', []] },
                            cond: { $eq: ['$$this.status', 'Present'] }
                          }
                        }
                      },
                      { $size: { $ifNull: ['$studentAttendance', []] } }
                    ]
                  },
                  100
                ]
              },
              else: 0
            }
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
          totalStudents: { $sum: '$totalStudentsCount' },
          totalPresent: { $sum: '$presentStudentsCount' },
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

// @desc    Get student's personal attendance statistics for a specific class and month
// @route   GET /api/attendance/student-stats/:studentId/:classId
// @access  Private (Student/Admin/Moderator)
const getStudentAttendanceStats = async (req, res) => {
  try {
    const { studentId, classId } = req.params;
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Validate class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Date range for the selected month
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    console.log('Fetching student attendance stats:', {
      studentId,
      classId,
      month: currentMonth,
      year: currentYear,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Get all attendance sheets for the class in the selected month
    const attendanceSheets = await Attendance.find({
      classId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    let totalSheets = 0;
    let presentCount = 0;
    let absentCount = 0;

    // Check student's attendance in each sheet
    attendanceSheets.forEach(sheet => {
      const studentAttendance = sheet.studentAttendance.find(
        attendance => attendance.studentId.toString() === studentId
      );

      if (studentAttendance) {
        totalSheets++;
        if (studentAttendance.status === 'Present') {
          presentCount++;
        } else {
          absentCount++;
        }
      }
    });

    // Calculate attendance percentage
    const attendancePercentage = totalSheets > 0 ? Math.round((presentCount / totalSheets) * 100) : 0;

    const stats = {
      totalSheets,
      presentCount,
      absentCount,
      attendancePercentage,
      month: currentMonth,
      year: currentYear,
      classId
    };

    console.log('Student attendance stats calculated:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching student attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student attendance statistics'
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
  getAttendanceAnalytics,
  getStudentAttendanceStats
};
