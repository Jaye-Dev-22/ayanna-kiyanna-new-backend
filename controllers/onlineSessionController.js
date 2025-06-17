const OnlineSession = require('../models/OnlineSession');
const Class = require('../models/Class');

// @desc    Create a new online session
// @route   POST /api/online-sessions
// @access  Private (Admin/Moderator only)
const createOnlineSession = async (req, res) => {
  try {
    const {
      title,
      description,
      meetingLink,
      meetingId,
      sessionDate,
      startTime,
      endTime,
      guidelines,
      additionalNote,
      classId
    } = req.body;

    // Validate required fields
    if (!title || !meetingLink || !sessionDate || !startTime || !endTime || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Title, meeting link, session date, start time, end time, and class ID are required'
      });
    }

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Validate time format and logic
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    // Check if start time is before end time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes >= endMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Create online session
    const onlineSession = new OnlineSession({
      title,
      description,
      meetingLink,
      meetingId,
      sessionDate: new Date(sessionDate),
      startTime,
      endTime,
      guidelines: guidelines || [],
      additionalNote,
      classId,
      createdBy: req.user.id
    });

    await onlineSession.save();

    // Populate the response
    const populatedSession = await OnlineSession.findById(onlineSession._id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Online session created successfully',
      data: populatedSession
    });

  } catch (err) {
    console.error('Error creating online session:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating online session',
      error: err.message
    });
  }
};

// @desc    Get all online sessions for a class
// @route   GET /api/online-sessions/class/:classId
// @access  Private
const getOnlineSessionsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Build query
    let query = { classId, isActive: true };

    // Filter by status if provided
    if (status) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (status === 'upcoming') {
        query.sessionDate = { $gte: today };
      } else if (status === 'past') {
        query.sessionDate = { $lt: today };
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get sessions with pagination (newest first)
    const sessions = await OnlineSession.find(query)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await OnlineSession.countDocuments(query);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (err) {
    console.error('Error fetching online sessions:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching online sessions',
      error: err.message
    });
  }
};

// @desc    Get a single online session
// @route   GET /api/online-sessions/:id
// @access  Private
const getOnlineSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await OnlineSession.findById(id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Online session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (err) {
    console.error('Error fetching online session:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching online session',
      error: err.message
    });
  }
};

// @desc    Update an online session
// @route   PUT /api/online-sessions/:id
// @access  Private (Admin/Moderator only)
const updateOnlineSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      meetingLink,
      meetingId,
      sessionDate,
      startTime,
      endTime,
      guidelines,
      additionalNote
    } = req.body;

    // Find the session
    const session = await OnlineSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Online session not found'
      });
    }

    // Validate time format and logic if times are being updated
    if (startTime || endTime) {
      const newStartTime = startTime || session.startTime;
      const newEndTime = endTime || session.endTime;
      
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newStartTime) || !timeRegex.test(newEndTime)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format. Use HH:MM format'
        });
      }

      // Check if start time is before end time
      const [startHour, startMinute] = newStartTime.split(':').map(Number);
      const [endHour, endMinute] = newEndTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (startMinutes >= endMinutes) {
        return res.status(400).json({
          success: false,
          message: 'Start time must be before end time'
        });
      }
    }

    // Update fields
    if (title !== undefined) session.title = title;
    if (description !== undefined) session.description = description;
    if (meetingLink !== undefined) session.meetingLink = meetingLink;
    if (meetingId !== undefined) session.meetingId = meetingId;
    if (sessionDate !== undefined) session.sessionDate = new Date(sessionDate);
    if (startTime !== undefined) session.startTime = startTime;
    if (endTime !== undefined) session.endTime = endTime;
    if (guidelines !== undefined) session.guidelines = guidelines;
    if (additionalNote !== undefined) session.additionalNote = additionalNote;

    await session.save();

    // Populate the response
    const populatedSession = await OnlineSession.findById(session._id)
      .populate('classId', 'grade category type')
      .populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Online session updated successfully',
      data: populatedSession
    });

  } catch (err) {
    console.error('Error updating online session:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating online session',
      error: err.message
    });
  }
};

// @desc    Delete an online session
// @route   DELETE /api/online-sessions/:id
// @access  Private (Admin/Moderator only)
const deleteOnlineSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await OnlineSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Online session not found'
      });
    }

    // Soft delete by setting isActive to false
    session.isActive = false;
    await session.save();

    res.json({
      success: true,
      message: 'Online session deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting online session:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting online session',
      error: err.message
    });
  }
};

module.exports = {
  createOnlineSession,
  getOnlineSessionsByClass,
  getOnlineSession,
  updateOnlineSession,
  deleteOnlineSession
};
