const { validationResult } = require('express-validator');
const TimeSchedule = require('../models/TimeSchedule');
const Class = require('../models/Class');

// Helper function to get current week of month
const getCurrentWeekOfMonth = (date = new Date()) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDay.getDay();
  
  // Calculate week number (1-5)
  const week = Math.ceil((dayOfMonth + dayOfWeek) / 7);
  return Math.min(week, 5); // Cap at 5 weeks max
};

// @desc    Get all time schedules for a class
// @route   GET /api/time-schedules/class/:classId
// @access  Private (Admin/Moderator/Student)
exports.getClassTimeSchedules = async (req, res) => {
  try {
    const { classId } = req.params;
    const { year, month } = req.query;

    // Build filter
    const filter = { classId };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const schedules = await TimeSchedule.find(filter)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email')
      .sort({ year: -1, month: -1, week: -1 });

    res.json(schedules);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get time schedule by ID
// @route   GET /api/time-schedules/:id
// @access  Private (Admin/Moderator/Student)
exports.getTimeScheduleById = async (req, res) => {
  try {
    const schedule = await TimeSchedule.findById(req.params.id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    if (!schedule) {
      return res.status(404).json({ message: 'Time schedule not found' });
    }

    res.json(schedule);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Time schedule not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Create new time schedule
// @route   POST /api/time-schedules
// @access  Private (Admin/Moderator)
exports.createTimeSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { classId, year, month, week, tasks, note } = req.body;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if schedule already exists for this class, year, month, week
    const existingSchedule = await TimeSchedule.findOne({
      classId,
      year,
      month,
      week
    });

    if (existingSchedule) {
      return res.status(400).json({
        message: 'Time schedule already exists for this week'
      });
    }

    const newSchedule = new TimeSchedule({
      classId,
      year,
      month,
      week,
      tasks: tasks || [],
      note,
      createdBy: req.user.id
    });

    const savedSchedule = await newSchedule.save();

    // Populate the created schedule before sending response
    const populatedSchedule = await TimeSchedule.findById(savedSchedule._id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    res.status(201).json(populatedSchedule);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Time schedule already exists for this week'
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update time schedule
// @route   PUT /api/time-schedules/:id
// @access  Private (Admin/Moderator)
exports.updateTimeSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { year, month, week, tasks, note } = req.body;

    let schedule = await TimeSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Time schedule not found' });
    }

    // Update fields
    if (year !== undefined) schedule.year = year;
    if (month !== undefined) schedule.month = month;
    if (week !== undefined) schedule.week = week;
    if (tasks !== undefined) schedule.tasks = tasks;
    if (note !== undefined) schedule.note = note;

    const updatedSchedule = await schedule.save();

    // Populate the updated schedule before sending response
    const populatedSchedule = await TimeSchedule.findById(updatedSchedule._id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    res.json(populatedSchedule);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Time schedule already exists for this week'
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Delete time schedule
// @route   DELETE /api/time-schedules/:id
// @access  Private (Admin/Moderator)
exports.deleteTimeSchedule = async (req, res) => {
  try {
    const schedule = await TimeSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Time schedule not found' });
    }

    await TimeSchedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Time schedule deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Time schedule not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Toggle task completion status
// @route   PUT /api/time-schedules/:id/tasks/:taskId/toggle
// @access  Private (Admin/Moderator)
exports.toggleTaskCompletion = async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const schedule = await TimeSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Time schedule not found' });
    }

    const task = schedule.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.isDone = !task.isDone;
    task.updatedAt = new Date();

    const updatedSchedule = await schedule.save();

    // Populate the updated schedule before sending response
    const populatedSchedule = await TimeSchedule.findById(updatedSchedule._id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    res.json(populatedSchedule);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get current week info (helper endpoint)
// @route   GET /api/time-schedules/current-week-info
// @access  Private (Admin/Moderator)
exports.getCurrentWeekInfo = async (req, res) => {
  try {
    const now = new Date();
    const currentWeekInfo = {
      year: now.getFullYear(),
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      week: getCurrentWeekOfMonth(now),
      monthName: now.toLocaleDateString('si-LK', { month: 'long' })
    };

    res.json(currentWeekInfo);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
