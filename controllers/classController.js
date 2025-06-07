const Class = require('../models/Class');
const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ClassRequest = require('../models/ClassRequest');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, grade, isActive } = req.query;

    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (grade) filter.grade = grade;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const classes = await Class.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Class.countDocuments(filter);

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
      classes: classesWithSpots,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get class by ID
exports.getClassById = async (req, res) => {
  try {
    // Get user role from token
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    const isStudent = user.role === 'student';

    // For students, check if they are enrolled in this class
    if (isStudent) {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Check if student is enrolled in this class
      const classItem = await Class.findById(req.params.id);
      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const isEnrolled = classItem.enrolledStudents.some(
        studentId => studentId.toString() === student._id.toString()
      );

      if (!isEnrolled) {
        return res.status(403).json({ message: 'Access denied. You are not enrolled in this class.' });
      }
    }

    // Build population query based on user role
    let populateQuery = Class.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (isAdmin) {
      // Admin gets full access to all data
      populateQuery = populateQuery
        .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
        .populate('monitors', 'studentId firstName lastName fullName email profilePicture');
    } else if (isStudent) {
      // Students get limited access - only basic class info and monitors
      populateQuery = populateQuery
        .populate('monitors', 'studentId firstName lastName fullName email profilePicture');
    }

    const classItem = await populateQuery;

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Add calculated fields
    const classObj = classItem.toObject();
    classObj.enrolledCount = classItem.enrolledStudents ? classItem.enrolledStudents.length : 0;
    classObj.availableSpots = classItem.capacity - classObj.enrolledCount;

    // For students, remove sensitive enrolled students data
    if (isStudent) {
      classObj.enrolledStudents = undefined;
    }

    res.json(classObj);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create new class
exports.createClass = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { type, grade, date, startTime, endTime, venue, capacity, specialNote } = req.body;

    // Validate time format and logic
    if (startTime >= endTime) {
      return res.status(400).json({
        message: 'End time must be after start time'
      });
    }

    // Check for scheduling conflicts
    const conflictingClass = await Class.findOne({
      date,
      venue,
      isActive: true,
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    });

    if (conflictingClass) {
      return res.status(400).json({
        message: 'Time slot conflict with existing class at the same venue'
      });
    }

    const { category, platform, locationLink } = req.body;

    const newClass = new Class({
      type,
      category,
      platform,
      locationLink,
      grade,
      date,
      startTime,
      endTime,
      venue,
      capacity,
      specialNote,
      createdBy: req.user.id
    });

    const savedClass = await newClass.save();

    // Populate the created class before sending response
    const populatedClass = await Class.findById(savedClass._id)
      .populate('createdBy', 'fullName email');

    res.status(201).json(populatedClass);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Helper function to create fee change notification
const createFeeChangeNotification = async (classId, oldFee, newFee, isFreeClass) => {
  try {
    const classDoc = await Class.findById(classId).populate('enrolledStudents');
    if (!classDoc) return;

    const notificationPromises = classDoc.enrolledStudents.map(async (student) => {
      const message = isFreeClass
        ? `Your class "${classDoc.grade}" has been changed to a free class.`
        : `The monthly fee for your class "${classDoc.grade}" has been changed from Rs. ${oldFee} to Rs. ${newFee}.`;

      return new Notification({
        recipient: student.userId,
        type: 'class_fee_change',
        title: 'Class Fee Update',
        message: message,
        data: {
          classId: classId,
          oldFee: oldFee,
          newFee: newFee,
          isFreeClass: isFreeClass
        }
      }).save();
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error creating fee change notifications:', error);
  }
};

// Update class
exports.updateClass = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      type,
      category,
      platform,
      locationLink,
      grade,
      date,
      startTime,
      endTime,
      venue,
      capacity,
      specialNote,
      isActive,
      isFreeClass,
      monthlyFee
    } = req.body;

    let classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Validate time format and logic
    if (startTime >= endTime) {
      return res.status(400).json({
        message: 'End time must be after start time'
      });
    }

    // Check for scheduling conflicts (excluding current class)
    const conflictingClass = await Class.findOne({
      _id: { $ne: req.params.id },
      date,
      venue,
      isActive: true,
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    });

    if (conflictingClass) {
      return res.status(400).json({
        message: 'Time slot conflict with existing class at the same venue'
      });
    }

    // Check if fee is being changed
    const isFeeChange = classItem.monthlyFee !== monthlyFee || classItem.isFreeClass !== isFreeClass;

    // Update fields
    classItem.type = type;
    classItem.category = category;
    classItem.platform = platform;
    classItem.locationLink = locationLink;
    classItem.grade = grade;
    classItem.date = date;
    classItem.startTime = startTime;
    classItem.endTime = endTime;
    classItem.venue = venue;
    classItem.capacity = capacity;
    classItem.specialNote = specialNote;
    if (isActive !== undefined) classItem.isActive = isActive;
    classItem.isFreeClass = isFreeClass;
    classItem.monthlyFee = monthlyFee;

    const updatedClass = await classItem.save();

    // If fee was changed, create notifications
    if (isFeeChange) {
      await createFeeChangeNotification(
        req.params.id,
        classItem.monthlyFee,
        monthlyFee,
        isFreeClass
      );
    }

    // Populate the updated class before sending response
    const populatedClass = await Class.findById(updatedClass._id)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'fullName email');

    res.json(populatedClass);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete class
exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // Find the class to be deleted
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    console.log(`Deleting class ${classId} with ${classItem.enrolledStudents.length} enrolled students`);

    // Remove this class from all students' enrolledClasses arrays
    const updateResult = await Student.updateMany(
      { enrolledClasses: classId },
      { $pull: { enrolledClasses: classId } }
    );

    console.log(`Removed class ${classId} from ${updateResult.modifiedCount} students' enrolledClasses`);

    // Also remove any related attendance sheets
    const attendanceDeleteResult = await Attendance.deleteMany({ classId: classId });
    console.log(`Deleted ${attendanceDeleteResult.deletedCount} attendance sheets for class ${classId}`);

    // Also remove any related class requests
    const classRequestDeleteResult = await ClassRequest.deleteMany({ class: classId });
    console.log(`Deleted ${classRequestDeleteResult.deletedCount} class requests for class ${classId}`);

    // Finally, delete the class itself
    await Class.findByIdAndDelete(classId);

    res.json({
      message: 'Class deleted successfully',
      details: {
        studentsUpdated: updateResult.modifiedCount,
        attendanceSheetsDeleted: attendanceDeleteResult.deletedCount,
        classRequestsDeleted: classRequestDeleteResult.deletedCount
      }
    });
  } catch (err) {
    console.error('Error deleting class:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available grades (for dropdown)
exports.getAvailableGrades = async (req, res) => {
  try {
    const grades = await Class.distinct('grade');
    const defaultGrades = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'A/L', 'Sinhala Literature'];

    // Combine default grades with custom grades from database
    const allGrades = [...new Set([...defaultGrades, ...grades])];

    res.json(allGrades.sort());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available venues (for dropdown)
exports.getAvailableVenues = async (req, res) => {
  try {
    const venues = await Class.distinct('venue');
    const defaultVenues = ['Home - De Zoisa Hall', 'Manawa Ruwanwella', 'Opulent Yatiyanthota'];

    // Combine default venues with custom venues from database
    const allVenues = [...new Set([...defaultVenues, ...venues])];

    res.json(allVenues.sort());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Enroll student in class (Admin function with bidirectional update)
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is already enrolled in class
    if (classItem.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ message: 'Student already enrolled in this class' });
    }

    // Check capacity
    if (classItem.enrolledStudents.length >= classItem.capacity) {
      return res.status(400).json({ message: 'Class is at full capacity' });
    }

    // Add student to class
    classItem.enrolledStudents.push(studentId);
    await classItem.save();

    // Add class to student's enrolledClasses (bidirectional update)
    if (!student.enrolledClasses.includes(classId)) {
      student.enrolledClasses.push(classId);
      await student.save();
    }

    // Send notification to student about enrollment
    try {
      const notification = new Notification({
        recipient: student.userId,
        type: 'class_enrollment',
        title: 'ඔබ නව පන්තියකට ලියාපදිංචි කර ඇත',
        message: `ඔබ ${classItem.grade} - ${classItem.category} පන්තියට සාර්ථකව ලියාපදිංචි කර ඇත. පන්ති විස්තර සහ කාලසටහන පරීක්ෂා කරන්න.`,
        data: {
          studentId: studentId,
          classId: classId
        }
      });
      await notification.save();
      console.log(`Enrollment notification sent to student ${student.studentId}`);
    } catch (notificationError) {
      console.error('Error sending enrollment notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
      .populate('monitors', 'studentId firstName lastName fullName email profilePicture');

    res.json({
      message: 'Student enrolled successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove student from class (Admin function with bidirectional update)
exports.removeStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from class enrolled list
    classItem.enrolledStudents = classItem.enrolledStudents.filter(
      id => id.toString() !== studentId
    );

    // Also remove from monitors if they are a monitor
    classItem.monitors = classItem.monitors.filter(
      id => id.toString() !== studentId
    );

    await classItem.save();

    // Remove class from student's enrolledClasses (bidirectional update)
    student.enrolledClasses = student.enrolledClasses.filter(
      id => id.toString() !== classId
    );
    await student.save();

    // Send notification to student about removal
    try {
      const notification = new Notification({
        recipient: student.userId,
        type: 'class_enrollment',
        title: 'ඔබ පන්තියකින් ඉවත් කර ඇත',
        message: `ඔබ ${classItem.grade} - ${classItem.category} පන්තියෙන් ඉවත් කර ඇත. වැඩිදුර විස්තර සඳහා පරිපාලකයා සම්බන්ධ කර ගන්න.`,
        data: {
          studentId: studentId,
          classId: classId
        }
      });
      await notification.save();
      console.log(`Removal notification sent to student ${student.studentId}`);
    } catch (notificationError) {
      console.error('Error sending removal notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
      .populate('monitors', 'studentId firstName lastName fullName email profilePicture');

    res.json({
      message: 'Student removed successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get normal category classes for filtering
exports.getNormalClasses = async (req, res) => {
  try {
    const classes = await Class.find({
      type: 'Normal',
      isActive: true
    })
      .select('_id grade category date startTime endTime venue')
      .sort({ date: 1, startTime: 1 });

    // Format class names for display
    const formattedClasses = classes.map(classItem => ({
      _id: classItem._id,
      name: `${classItem.grade} - ${classItem.category} (${classItem.date} ${classItem.startTime}-${classItem.endTime})`
    }));

    res.json({ classes: formattedClasses });
  } catch (err) {
    console.error('Error in getNormalClasses:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get public classes for Classes & Time Tables page
exports.getPublicClasses = async (req, res) => {
  try {
    const classes = await Class.find({
      type: 'Normal',
      isActive: true
    })
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
    console.error('Error in getPublicClasses:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get available students for enrollment (not already enrolled in this class)
exports.getAvailableStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    const { filterClassId } = req.query;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Build base query for available students
    let query = {
      status: 'Approved'
    };

    // If filtering by class, get students from that class
    if (filterClassId) {
      const filterClass = await Class.findById(filterClassId);
      if (!filterClass) {
        return res.status(404).json({ message: 'Filter class not found' });
      }

      // Get students who are enrolled in the filter class
      query._id = { $in: filterClass.enrolledStudents };
    }

    // Exclude students who are already enrolled in the target class
    if (classItem.enrolledStudents && classItem.enrolledStudents.length > 0) {
      query._id = {
        ...query._id,
        $nin: classItem.enrolledStudents
      };
    }

    // Get available students
    const availableStudents = await Student.find(query)
      .select('studentId firstName lastName fullName email profilePicture selectedGrade school contactNumber')
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      students: availableStudents,
      count: availableStudents.length
    });
  } catch (err) {
    console.error('Error in getAvailableStudents:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Bulk enroll students in class
exports.bulkEnrollStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const classId = req.params.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'No students provided for enrollment' });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if class has enough capacity
    const currentEnrolledCount = classItem.enrolledStudents ? classItem.enrolledStudents.length : 0;
    if (currentEnrolledCount + studentIds.length > classItem.capacity) {
      return res.status(400).json({
        message: 'Class capacity exceeded',
        currentEnrolled: currentEnrolledCount,
        capacity: classItem.capacity,
        requested: studentIds.length
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Process each student
    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId);
        if (!student) {
          results.failed.push({
            studentId,
            reason: 'Student not found'
          });
          continue;
        }

        // Check if already enrolled
        if (classItem.enrolledStudents.includes(studentId)) {
          results.failed.push({
            studentId,
            reason: 'Already enrolled'
          });
          continue;
        }

        // Add student to class
        classItem.enrolledStudents.push(studentId);

        // Add class to student's enrolledClasses
        if (!student.enrolledClasses.includes(classId)) {
          student.enrolledClasses.push(classId);
          await student.save();
        }

        // Send notification
        try {
          const notification = new Notification({
            recipient: student.userId,
            type: 'class_enrollment',
            title: 'ඔබ නව පන්තියකට ලියාපදිංචි කර ඇත',
            message: `ඔබ ${classItem.grade} - ${classItem.category} පන්තියට සාර්ථකව ලියාපදිංචි කර ඇත. පන්ති විස්තර සහ කාලසටහන පරීක්ෂා කරන්න.`,
            data: {
              studentId: studentId,
              classId: classId
            }
          });
          await notification.save();
        } catch (notificationError) {
          console.error('Error sending enrollment notification:', notificationError);
        }

        results.success.push(studentId);
      } catch (error) {
        results.failed.push({
          studentId,
          reason: error.message
        });
      }
    }

    // Save class changes
    await classItem.save();

    res.json({
      message: 'Bulk enrollment completed',
      results
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Clean and reset available spots - Data integrity check
exports.cleanAndResetAvailableSpots = async (req, res) => {
  try {
    console.log('Starting Clean and Reset Available Spots process...');

    const Student = require('../models/Student');
    let totalClassesProcessed = 0;
    let totalStudentsRemoved = 0;
    let totalDeletedStudentsRemoved = 0;
    const cleanupReport = [];

    // Get all classes
    const allClasses = await Class.find({});
    console.log(`Found ${allClasses.length} classes to process`);

    for (const classItem of allClasses) {
      let classModified = false;
      const originalEnrolledCount = classItem.enrolledStudents ? classItem.enrolledStudents.length : 0;
      const studentsToRemove = [];

      if (classItem.enrolledStudents && classItem.enrolledStudents.length > 0) {
        // Check each enrolled student
        for (const studentId of classItem.enrolledStudents) {
          try {
            // Check if student exists
            const student = await Student.findById(studentId);

            if (!student) {
              // Student doesn't exist (deleted) - remove from class
              studentsToRemove.push(studentId);
              totalDeletedStudentsRemoved++;
              console.log(`Deleted student ${studentId} will be removed from class ${classItem.grade} - ${classItem.category}`);
            } else {
              // Student exists - check if class is in their enrolledClasses
              const isEnrolledInStudent = student.enrolledClasses &&
                student.enrolledClasses.some(classId => classId.equals(classItem._id));

              if (!isEnrolledInStudent) {
                // Student exists but class not in their enrolledClasses - remove from class
                studentsToRemove.push(studentId);
                totalStudentsRemoved++;
                console.log(`Student ${student.firstName} ${student.lastName} (${student.studentId}) will be removed from class ${classItem.grade} - ${classItem.category} - not in student's enrolledClasses`);
              }
            }
          } catch (error) {
            // Error finding student (likely deleted) - remove from class
            studentsToRemove.push(studentId);
            totalDeletedStudentsRemoved++;
            console.log(`Error finding student ${studentId}, will be removed from class ${classItem.grade} - ${classItem.category}`);
          }
        }

        // Remove identified students from class
        if (studentsToRemove.length > 0) {
          classItem.enrolledStudents = classItem.enrolledStudents.filter(
            studentId => !studentsToRemove.some(removeId => removeId.equals ? removeId.equals(studentId) : removeId.toString() === studentId.toString())
          );
          classModified = true;
        }
      }

      // Save class if modified
      if (classModified) {
        await classItem.save();
        const newEnrolledCount = classItem.enrolledStudents.length;
        const newAvailableSpots = classItem.capacity - newEnrolledCount;

        cleanupReport.push({
          classId: classItem._id,
          className: `${classItem.grade} - ${classItem.category}`,
          originalEnrolledCount,
          newEnrolledCount,
          studentsRemoved: studentsToRemove.length,
          newAvailableSpots
        });

        console.log(`Updated class ${classItem.grade} - ${classItem.category}: ${originalEnrolledCount} → ${newEnrolledCount} students`);
      }

      totalClassesProcessed++;
    }

    const summary = {
      totalClassesProcessed,
      totalStudentsRemoved,
      totalDeletedStudentsRemoved,
      classesModified: cleanupReport.length,
      cleanupReport,
      timestamp: new Date().toISOString()
    };

    console.log('Clean and Reset Available Spots completed:', summary);

    if (res) {
      // If called via API endpoint
      res.json({
        success: true,
        message: 'Available spots cleaned and reset successfully',
        summary
      });
    } else {
      // If called internally
      return summary;
    }

  } catch (error) {
    console.error('Error in cleanAndResetAvailableSpots:', error);
    if (res) {
      res.status(500).json({
        success: false,
        message: 'Error cleaning available spots',
        error: error.message
      });
    } else {
      throw error;
    }
  }
};

// Add monitor to class
exports.addMonitor = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is enrolled in this class
    if (!classItem.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ message: 'Student must be enrolled in this class to become a monitor' });
    }

    // Check if student is already a monitor
    if (classItem.monitors.includes(studentId)) {
      return res.status(400).json({ message: 'Student is already a monitor for this class' });
    }

    // Check monitor limit
    if (classItem.monitors.length >= 5) {
      return res.status(400).json({ message: 'Maximum 5 monitors allowed per class' });
    }

    classItem.monitors.push(studentId);
    await classItem.save();

    // Send notification to the student who was made a monitor
    try {
      const notification = new Notification({
        recipient: student.userId,
        type: 'monitor_added',
        title: 'ඔබ පන්ති නිරීක්ෂකයෙකු ලෙස තෝරාගෙන ඇත',
        message: `ඔබ ${classItem.grade} - ${classItem.category} පන්තියේ නිරීක්ෂකයෙකු ලෙස තෝරාගෙන ඇත. ඔබට දැන් පැමිණීම් කළමනාකරණය සඳහා විශේෂ අවසර ලැබී ඇත.`,
        data: {
          studentId: studentId,
          classId: classId
        }
      });
      await notification.save();
      console.log(`Monitor added notification sent to student ${student.studentId}`);
    } catch (notificationError) {
      console.error('Error sending monitor added notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
      .populate('monitors', 'studentId firstName lastName fullName email profilePicture');

    res.json({
      message: 'Monitor added successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove monitor from class
exports.removeMonitor = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get student info before removing for notification
    const student = await Student.findById(studentId);

    // Remove student from monitors list
    classItem.monitors = classItem.monitors.filter(
      id => id.toString() !== studentId
    );

    await classItem.save();

    // Send notification to the student who was removed as monitor
    if (student) {
      try {
        const notification = new Notification({
          recipient: student.userId,
          type: 'monitor_removed',
          title: 'ඔබ පන්ති නිරීක්ෂක තනතුරෙන් ඉවත් කර ඇත',
          message: `ඔබ ${classItem.grade} - ${classItem.category} පන්තියේ නිරීක්ෂක තනතුරෙන් ඉවත් කර ඇත. ඔබගේ පැමිණීම් කළමනාකරණ අවසර අවලංගු කර ඇත.`,
          data: {
            studentId: studentId,
            classId: classId
          }
        });
        await notification.save();
        console.log(`Monitor removed notification sent to student ${student.studentId}`);
      } catch (notificationError) {
        console.error('Error sending monitor removed notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
      .populate('monitors', 'studentId firstName lastName fullName email profilePicture');

    res.json({
      message: 'Monitor removed successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get enrolled students for a class (with search)
exports.getEnrolledStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    const { search } = req.query;

    // Get user role from token
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    const isStudent = user.role === 'student';

    // For students, check if they are enrolled in this class
    if (isStudent) {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Check if student is enrolled in this class
      const classItem = await Class.findById(classId);
      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const isEnrolled = classItem.enrolledStudents.some(
        studentId => studentId.toString() === student._id.toString()
      );

      if (!isEnrolled) {
        return res.status(403).json({ message: 'Access denied. You are not enrolled in this class.' });
      }
    }

    // Only admins can view detailed student information
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required to view student details.' });
    }

    const classItem = await Class.findById(classId)
      .populate({
        path: 'enrolledStudents',
        select: 'studentId firstName lastName fullName email profilePicture selectedGrade contactNumber whatsappNumber school status',
        options: { virtuals: true }
      });

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    let students = classItem.enrolledStudents || [];

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      students = students.filter(student =>
        student.studentId.toLowerCase().includes(searchTerm) ||
        student.firstName.toLowerCase().includes(searchTerm) ||
        student.lastName.toLowerCase().includes(searchTerm) ||
        (student.fullName && student.fullName.toLowerCase().includes(searchTerm))
      );
    }

    res.json({
      students,
      total: students.length,
      classInfo: {
        _id: classItem._id,
        grade: classItem.grade,
        category: classItem.category,
        capacity: classItem.capacity,
        enrolledCount: classItem.enrolledStudents ? classItem.enrolledStudents.length : 0
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Confirm monitors - Check if monitor students are currently enrolled in the class
exports.confirmMonitors = async (req, res) => {
  try {
    const classId = req.params.id;
    const Student = require('../models/Student');

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    let monitorsRemoved = 0;
    const removedMonitors = [];
    const originalMonitorsCount = classItem.monitors ? classItem.monitors.length : 0;

    if (classItem.monitors && classItem.monitors.length > 0) {
      const monitorsToRemove = [];

      // Check each monitor
      for (const monitorId of classItem.monitors) {
        try {
          // Check if monitor student exists
          const student = await Student.findById(monitorId);

          if (!student) {
            // Student doesn't exist (deleted) - remove from monitors
            monitorsToRemove.push(monitorId);
            removedMonitors.push({ id: monitorId.toString(), reason: 'Student deleted' });
            console.log(`Deleted student ${monitorId} will be removed from class monitors`);
          } else {
            // Student exists - check if class is in their enrolledClasses
            const isEnrolledInClass = student.enrolledClasses &&
              student.enrolledClasses.some(classId => classId.equals(classItem._id));

            if (!isEnrolledInClass) {
              // Student exists but not enrolled in this class - remove from monitors
              monitorsToRemove.push(monitorId);
              removedMonitors.push({
                id: monitorId.toString(),
                name: `${student.firstName} ${student.lastName}`,
                studentId: student.studentId,
                reason: 'Not enrolled in class'
              });
              console.log(`Student ${student.firstName} ${student.lastName} (${student.studentId}) will be removed from monitors - not enrolled in class`);
            }
          }
        } catch (error) {
          // Error finding student (likely deleted) - remove from monitors
          monitorsToRemove.push(monitorId);
          removedMonitors.push({ id: monitorId.toString(), reason: 'Error finding student' });
          console.log(`Error finding student ${monitorId}, will be removed from monitors`);
        }
      }

      // Remove identified monitors from class
      if (monitorsToRemove.length > 0) {
        classItem.monitors = classItem.monitors.filter(
          monitorId => !monitorsToRemove.some(removeId =>
            removeId.equals ? removeId.equals(monitorId) : removeId.toString() === monitorId.toString()
          )
        );
        monitorsRemoved = monitorsToRemove.length;
        await classItem.save();
      }
    }

    const summary = {
      classId: classItem._id,
      className: `${classItem.grade} - ${classItem.category}`,
      originalMonitorsCount,
      newMonitorsCount: classItem.monitors.length,
      monitorsRemoved,
      removedMonitors,
      timestamp: new Date().toISOString()
    };

    console.log('Monitor confirmation completed:', summary);

    // Get updated class with populated monitors
    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'studentId firstName lastName fullName email profilePicture selectedGrade')
      .populate('monitors', 'studentId firstName lastName fullName email profilePicture');

    if (res) {
      // If called via API endpoint
      res.json({
        success: true,
        message: monitorsRemoved > 0 ?
          `Monitor confirmation completed. ${monitorsRemoved} invalid monitor(s) removed.` :
          'All monitors are valid and currently enrolled in the class.',
        summary,
        class: updatedClass
      });
    } else {
      // If called internally
      return summary;
    }

  } catch (error) {
    console.error('Error in confirmMonitors:', error);
    if (res) {
      res.status(500).json({
        success: false,
        message: 'Error confirming monitors',
        error: error.message
      });
    } else {
      throw error;
    }
  }
};