const GrammarFolder = require('../models/GrammarFolder');
const GrammarFile = require('../models/GrammarFile');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Create new grammar folder
// @route   POST /api/grammar/folders
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

    const { title, description } = req.body;

    // Create folder
    const folder = new GrammarFolder({
      title,
      description,
      createdBy: req.user.id
    });

    await folder.save();

    // Populate creator information
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Grammar folder created successfully',
      data: folder
    });
  } catch (err) {
    console.error('Error creating grammar folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all grammar folders
// @route   GET /api/grammar/folders
// @access  Private
const getAllFolders = async (req, res) => {
  try {
    const folders = await GrammarFolder.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: folders
    });
  } catch (err) {
    console.error('Error fetching grammar folders:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/grammar/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await GrammarFolder.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar folder not found'
      });
    }

    res.json({
      success: true,
      data: folder
    });
  } catch (err) {
    console.error('Error fetching grammar folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update grammar folder
// @route   PUT /api/grammar/folders/:id
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

    const folder = await GrammarFolder.findById(req.params.id);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar folder not found'
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
      message: 'Grammar folder updated successfully',
      data: folder
    });
  } catch (err) {
    console.error('Error updating grammar folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete grammar folder
// @route   DELETE /api/grammar/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await GrammarFolder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Grammar folder not found'
      });
    }

    // Soft delete - set isActive to false
    folder.isActive = false;
    await folder.save();

    // Also soft delete all files in this folder
    await GrammarFile.updateMany(
      { folderId: req.params.id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Grammar folder deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting grammar folder:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new grammar file
// @route   POST /api/grammar/files
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

    const { title, description, content, attachments, folderId } = req.body;

    // Check if folder exists
    const folder = await GrammarFolder.findById(folderId);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar folder not found'
      });
    }

    // Create file
    const file = new GrammarFile({
      title,
      description,
      content: content || '',
      attachments: attachments || [],
      folderId,
      createdBy: req.user.id
    });

    await file.save();

    // Populate creator and folder information
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Grammar file created successfully',
      data: file
    });
  } catch (err) {
    console.error('Error creating grammar file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/grammar/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Check if folder exists
    const folder = await GrammarFolder.findById(folderId);
    if (!folder || !folder.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar folder not found'
      });
    }

    const files = await GrammarFile.find({ folderId, isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: files
    });
  } catch (err) {
    console.error('Error fetching grammar files:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/grammar/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await GrammarFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title');

    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar file not found'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (err) {
    console.error('Error fetching grammar file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update grammar file
// @route   PUT /api/grammar/files/:id
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

    const { title, description, content, attachments } = req.body;

    const file = await GrammarFile.findById(req.params.id);
    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Grammar file not found'
      });
    }

    // Update file
    file.title = title;
    file.description = description;
    file.content = content || '';
    file.attachments = attachments || [];
    file.updatedAt = Date.now();

    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);

    res.json({
      success: true,
      message: 'Grammar file updated successfully',
      data: file
    });
  } catch (err) {
    console.error('Error updating grammar file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete grammar file
// @route   DELETE /api/grammar/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await GrammarFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Grammar file not found'
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
      message: 'Grammar file deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting grammar file:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  createFile,
  getFolderFiles,
  getFileById,
  updateFile,
  deleteFile
};
