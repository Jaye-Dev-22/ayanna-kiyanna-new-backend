const StudentNotice = require('../models/StudentNotice');
const { validationResult } = require('express-validator');

// @desc    Create new student notice
// @route   POST /api/student-notices
// @access  Private (Admin/Moderator)
const createNotice = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, content2, attachments, sourceLinks } = req.body;

    // Create new student notice
    const notice = new StudentNotice({
      title,
      content,
      content2,
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      createdBy: req.user.id
    });

    await notice.save();
    await notice.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Student notice created successfully',
      data: notice
    });
  } catch (error) {
    console.error('Error creating student notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating student notice'
    });
  }
};

// @desc    Get all student notices
// @route   GET /api/student-notices
// @access  Private
const getAllNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const notices = await StudentNotice.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudentNotice.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: notices,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalNotices: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching student notices:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student notices'
    });
  }
};

// @desc    Get student notice by ID
// @route   GET /api/student-notices/:id
// @access  Private
const getNoticeById = async (req, res) => {
  try {
    const notice = await StudentNotice.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Student notice not found'
      });
    }

    res.json({
      success: true,
      data: notice
    });
  } catch (error) {
    console.error('Error fetching student notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student notice'
    });
  }
};

// @desc    Update student notice
// @route   PUT /api/student-notices/:id
// @access  Private (Admin/Moderator)
const updateNotice = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, content2, attachments, sourceLinks } = req.body;

    const notice = await StudentNotice.findById(req.params.id);
    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Student notice not found'
      });
    }

    // Update fields
    notice.title = title;
    notice.content = content;
    notice.content2 = content2 || '';
    notice.attachments = attachments || [];
    notice.sourceLinks = sourceLinks || [];

    await notice.save();
    await notice.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Student notice updated successfully',
      data: notice
    });
  } catch (error) {
    console.error('Error updating student notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student notice'
    });
  }
};

// @desc    Delete student notice
// @route   DELETE /api/student-notices/:id
// @access  Private (Admin/Moderator)
const deleteNotice = async (req, res) => {
  try {
    const notice = await StudentNotice.findById(req.params.id);
    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Student notice not found'
      });
    }

    // Soft delete
    notice.isActive = false;
    await notice.save();

    res.json({
      success: true,
      message: 'Student notice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting student notice'
    });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
};
