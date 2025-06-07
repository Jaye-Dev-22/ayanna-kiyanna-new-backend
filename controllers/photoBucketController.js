const PhotoBucket = require('../models/PhotoBucket');
const { validationResult } = require('express-validator');

// @desc    Create new photo
// @route   POST /api/photo-bucket
// @access  Private (Admin/Moderator)
const createPhoto = async (req, res) => {
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

    const { title, description, attachment, sourceLinks } = req.body;

    // Create new photo
    const photo = new PhotoBucket({
      title,
      description,
      attachment,
      sourceLinks: sourceLinks || [],
      createdBy: req.user.id
    });

    await photo.save();

    // Populate creator information
    await photo.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Photo created successfully',
      data: photo
    });
  } catch (error) {
    console.error('Error creating photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating photo'
    });
  }
};

// @desc    Get all photos
// @route   GET /api/photo-bucket
// @access  Private
const getAllPhotos = async (req, res) => {
  try {
    const photos = await PhotoBucket.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 }); // Newest first for display, but stored oldest first

    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching photos'
    });
  }
};

// @desc    Get photo by ID
// @route   GET /api/photo-bucket/:id
// @access  Private
const getPhotoById = async (req, res) => {
  try {
    const photo = await PhotoBucket.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!photo || !photo.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    res.json({
      success: true,
      data: photo
    });
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching photo'
    });
  }
};

// @desc    Update photo
// @route   PUT /api/photo-bucket/:id
// @access  Private (Admin/Moderator)
const updatePhoto = async (req, res) => {
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

    const { title, description, attachment, sourceLinks } = req.body;

    const photo = await PhotoBucket.findById(req.params.id);

    if (!photo || !photo.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Update fields
    photo.title = title;
    photo.description = description;
    if (attachment) {
      photo.attachment = attachment;
    }
    photo.sourceLinks = sourceLinks || [];

    await photo.save();

    // Populate creator information
    await photo.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Photo updated successfully',
      data: photo
    });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating photo'
    });
  }
};

// @desc    Delete photo
// @route   DELETE /api/photo-bucket/:id
// @access  Private (Admin/Moderator)
const deletePhoto = async (req, res) => {
  try {
    const photo = await PhotoBucket.findById(req.params.id);

    if (!photo || !photo.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Soft delete by setting isActive to false
    photo.isActive = false;
    await photo.save();

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting photo'
    });
  }
};

module.exports = {
  createPhoto,
  getAllPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto
};
