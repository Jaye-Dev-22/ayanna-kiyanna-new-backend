const GradeFolder = require('../models/GradeFolder');
const GradeFile = require('../models/GradeFile');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Create new grade folder
// @route   POST /api/grades/folders
// @access  Private (Admin/Moderator)
const createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, gradeCategory } = req.body;

    // Validate grade category
    const validCategories = ['grade-9', 'grade-10', 'grade-11', 'a-level', 'sinhala-literature'];
    if (!validCategories.includes(gradeCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grade category'
      });
    }

    // Create folder
    const folder = new GradeFolder({
      title,
      description,
      gradeCategory,
      createdBy: req.user.id
    });

    await folder.save();

    // Populate creator information
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Grade folder created successfully',
      data: folder
    });
  } catch (err) {
    console.error('Error creating grade folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all folders for a grade category
// @route   GET /api/grades/folders/:gradeCategory
// @access  Private
const getFoldersByCategory = async (req, res) => {
  try {
    const { gradeCategory } = req.params;

    // Validate grade category
    const validCategories = ['grade-9', 'grade-10', 'grade-11', 'a-level', 'sinhala-literature'];
    if (!validCategories.includes(gradeCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grade category'
      });
    }

    const folders = await GradeFolder.find({ gradeCategory, isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }); // Sort oldest first (1 = ascending)

    res.json({
      success: true,
      data: folders
    });
  } catch (err) {
    console.error('Error fetching grade folders:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/grades/folders/single/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await GradeFolder.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade folder not found'
      });
    }

    res.json({
      success: true,
      data: folder
    });
  } catch (err) {
    console.error('Error fetching grade folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update grade folder
// @route   PUT /api/grades/folders/:id
// @access  Private (Admin/Moderator)
const updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description } = req.body;

    const folder = await GradeFolder.findById(req.params.id);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade folder not found'
      });
    }

    // Update folder
    folder.title = title;
    folder.description = description;
    folder.updatedAt = Date.now();

    await folder.save();
    await folder.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Grade folder updated successfully',
      data: folder
    });
  } catch (err) {
    console.error('Error updating grade folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete grade folder
// @route   DELETE /api/grades/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await GradeFolder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Grade folder not found'
      });
    }

    // Soft delete - set isActive to false
    folder.isActive = false;
    await folder.save();

    // Also soft delete all files in this folder
    await GradeFile.updateMany(
      { folderId: req.params.id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Grade folder deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting grade folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new grade file
// @route   POST /api/grades/files
// @access  Private (Admin/Moderator)
const createFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, content, attachments, sourceLinks, folderId } = req.body;

    // Validate source links if provided
    if (sourceLinks && Array.isArray(sourceLinks)) {
      for (const link of sourceLinks) {
        if (link.title && link.title.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Source link title must be less than 100 characters'
          });
        }
        if (link.url && !link.url.match(/^https?:\/\/.+/)) {
          return res.status(400).json({
            success: false,
            message: 'Source link URL must be valid (start with http:// or https://)'
          });
        }
        if (link.description && link.description.length > 200) {
          return res.status(400).json({
            success: false,
            message: 'Source link description must be less than 200 characters'
          });
        }
      }
    }

    // Check if folder exists and get its grade category
    const folder = await GradeFolder.findById(folderId);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade folder not found'
      });
    }

    // Create file
    const file = new GradeFile({
      title,
      description,
      content: content || '',
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      folderId,
      gradeCategory: folder.gradeCategory,
      createdBy: req.user.id
    });

    await file.save();

    // Populate creator and folder information
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title gradeCategory' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Grade file created successfully',
      data: file
    });
  } catch (err) {
    console.error('Error creating grade file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/grades/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Check if folder exists
    const folder = await GradeFolder.findById(folderId);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade folder not found'
      });
    }

    const files = await GradeFile.find({ folderId, isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title gradeCategory')
      .sort({ createdAt: 1 }); // Sort oldest first (1 = ascending)

    res.json({
      success: true,
      data: files
    });
  } catch (err) {
    console.error('Error fetching grade files:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/grades/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await GradeFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title gradeCategory');

    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade file not found'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (err) {
    console.error('Error fetching grade file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update grade file
// @route   PUT /api/grades/files/:id
// @access  Private (Admin/Moderator)
const updateFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, content, attachments, sourceLinks } = req.body;

    // Validate source links if provided
    if (sourceLinks && Array.isArray(sourceLinks)) {
      for (const link of sourceLinks) {
        if (link.title && link.title.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Source link title must be less than 100 characters'
          });
        }
        if (link.url && !link.url.match(/^https?:\/\/.+/)) {
          return res.status(400).json({
            success: false,
            message: 'Source link URL must be valid (start with http:// or https://)'
          });
        }
        if (link.description && link.description.length > 200) {
          return res.status(400).json({
            success: false,
            message: 'Source link description must be less than 200 characters'
          });
        }
      }
    }

    const file = await GradeFile.findById(req.params.id);
    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grade file not found'
      });
    }

    // Update file
    file.title = title;
    file.description = description;
    file.content = content || '';
    file.attachments = attachments || [];
    file.sourceLinks = sourceLinks || [];
    file.updatedAt = Date.now();

    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title gradeCategory' }
    ]);

    res.json({
      success: true,
      message: 'Grade file updated successfully',
      data: file
    });
  } catch (err) {
    console.error('Error updating grade file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete grade file
// @route   DELETE /api/grades/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await GradeFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Grade file not found'
      });
    }

    // Delete attachments from Cloudinary
    if (file.attachments && file.attachments.length > 0) {
      for (const attachment of file.attachments) {
        try {
          await cloudinary.uploader.destroy(attachment.publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }
    }

    // Soft delete - set isActive to false
    file.isActive = false;
    await file.save();

    res.json({
      success: true,
      message: 'Grade file deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting grade file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createFolder,
  getFoldersByCategory,
  getFolderById,
  updateFolder,
  deleteFolder,
  createFile,
  getFolderFiles,
  getFileById,
  updateFile,
  deleteFile
};
