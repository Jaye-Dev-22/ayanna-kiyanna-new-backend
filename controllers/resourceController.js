const Resource = require('../models/Resource');
const Class = require('../models/Class');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Create new resource
// @route   POST /api/resources
// @access  Private (Admin/Moderator)
const createResource = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, attachments, externalLinks, classId } = req.body;

    // Check if class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Create resource
    const resource = new Resource({
      title,
      description,
      attachments: attachments || [],
      externalLinks: externalLinks || [],
      classId,
      createdBy: req.user.id
    });

    await resource.save();

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      resource
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

// @desc    Get all resources for a class
// @route   GET /api/resources/class/:classId
// @access  Private (Admin/Moderator/Student)
const getClassResources = async (req, res) => {
  try {
    const { classId } = req.params;

    const resources = await Resource.find({ 
      classId, 
      isActive: true 
    })
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      resources
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

// @desc    Get resource by ID
// @route   GET /api/resources/:id
// @access  Private (Admin/Moderator/Student)
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('classId', 'grade category type');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (!resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not available'
      });
    }

    res.json({
      success: true,
      resource
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

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private (Admin/Moderator)
const updateResource = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, attachments, externalLinks, isActive } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Update fields
    resource.title = title || resource.title;
    resource.description = description || resource.description;
    resource.attachments = attachments !== undefined ? attachments : resource.attachments;
    resource.externalLinks = externalLinks !== undefined ? externalLinks : resource.externalLinks;
    resource.isActive = isActive !== undefined ? isActive : resource.isActive;

    await resource.save();

    res.json({
      success: true,
      message: 'Resource updated successfully',
      resource
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

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Admin/Moderator)
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Delete attachments from Cloudinary
    if (resource.attachments && resource.attachments.length > 0) {
      for (const attachment of resource.attachments) {
        try {
          await cloudinary.uploader.destroy(attachment.publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }
    }

    // Delete resource
    await Resource.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Resource deleted successfully'
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
  createResource,
  getClassResources,
  getResourceById,
  updateResource,
  deleteResource
};
