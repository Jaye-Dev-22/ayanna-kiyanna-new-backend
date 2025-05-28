const Class = require('../models/Class');
const User = require('../models/User');
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
    const classItem = await Class.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'fullName email');

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classItem);
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

// Update class
exports.updateClass = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { type, category, platform, locationLink, grade, date, startTime, endTime, venue, capacity, specialNote, isActive } = req.body;

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

    const updatedClass = await classItem.save();

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
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error(err.message);
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

// Enroll student in class
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is already enrolled
    if (classItem.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ message: 'Student already enrolled in this class' });
    }

    // Check capacity
    if (classItem.enrolledStudents.length >= classItem.capacity) {
      return res.status(400).json({ message: 'Class is at full capacity' });
    }

    classItem.enrolledStudents.push(studentId);
    await classItem.save();

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'fullName email');

    res.json(updatedClass);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove student from class
exports.removeStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.id;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Remove student from enrolled list
    classItem.enrolledStudents = classItem.enrolledStudents.filter(
      id => id.toString() !== studentId
    );

    await classItem.save();

    const updatedClass = await Class.findById(classId)
      .populate('createdBy', 'fullName email')
      .populate('enrolledStudents', 'fullName email');

    res.json(updatedClass);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
