const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Admin/Moderator)
const createAnnouncement = async (req, res) => {
  try {
    console.log('=== BACKEND: CREATE ANNOUNCEMENT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('Headers:', req.headers);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, attachments, priority, classId, expiryDate } = req.body;
    console.log('Extracted fields:', { title, description, attachments, priority, classId, expiryDate });

    // Check if class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      description,
      attachments: attachments || [],
      priority: priority || 'Medium',
      classId,
      expiryDate,
      createdBy: req.user.id
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get all announcements for a class
// @route   GET /api/announcements/class/:classId
// @access  Private (Admin/Moderator/Student)
const getClassAnnouncements = async (req, res) => {
  try {
    const { classId } = req.params;

    // Build filter
    const filter = { 
      classId, 
      isActive: true 
    };

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } }
    ];

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'fullName')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      announcements
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get announcement by ID
// @route   GET /api/announcements/:id
// @access  Private (Admin/Moderator/Student)
const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('classId', 'grade category type');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (!announcement.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not available'
      });
    }

    // Check if announcement is expired
    if (announcement.expiryDate && new Date() > announcement.expiryDate) {
      return res.status(404).json({
        success: false,
        message: 'Announcement has expired'
      });
    }

    res.json({
      success: true,
      announcement
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin/Moderator)
const updateAnnouncement = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, attachments, priority, isActive, expiryDate } = req.body;

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Update fields
    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    announcement.attachments = attachments !== undefined ? attachments : announcement.attachments;
    announcement.priority = priority || announcement.priority;
    announcement.isActive = isActive !== undefined ? isActive : announcement.isActive;
    announcement.expiryDate = expiryDate !== undefined ? expiryDate : announcement.expiryDate;

    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/Moderator)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Delete attachments from Cloudinary
    if (announcement.attachments && announcement.attachments.length > 0) {
      for (const attachment of announcement.attachments) {
        try {
          await cloudinary.uploader.destroy(attachment.publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }
    }

    // Delete announcement
    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get announcement count for a class
// @route   GET /api/announcements/class/:classId/count
// @access  Private (Admin/Moderator/Student)
const getClassAnnouncementCount = async (req, res) => {
  try {
    const { classId } = req.params;

    // Build filter
    const filter = {
      classId,
      isActive: true
    };

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } }
    ];

    const count = await Announcement.countDocuments(filter);

    res.json({
      success: true,
      count
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

module.exports = {
  createAnnouncement,
  getClassAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getClassAnnouncementCount
};
