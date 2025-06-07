const { validationResult } = require('express-validator');
const ViyanjanaFolder = require('../models/ViyanjanaFolder');
const ViyanjanaFile = require('../models/ViyanjanaFile');

// Folder Controllers

// @desc    Create new viyanjana folder
// @route   POST /api/viyanjana/folders
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

    const folder = new ViyanjanaFolder({
      title,
      description,
      createdBy: req.user.id
    });

    await folder.save();
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Viyanjana folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error creating viyanjana folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating folder'
    });
  }
};

// @desc    Get all viyanjana folders
// @route   GET /api/viyanjana/folders
// @access  Private
const getAllFolders = async (req, res) => {
  try {
    const folders = await ViyanjanaFolder.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }); // Old first, new last

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching viyanjana folders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folders'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/viyanjana/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await ViyanjanaFolder.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error fetching viyanjana folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folder'
    });
  }
};

// @desc    Update viyanjana folder
// @route   PUT /api/viyanjana/folders/:id
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

    const folder = await ViyanjanaFolder.findByIdAndUpdate(
      req.params.id,
      { title, description, updatedAt: Date.now() },
      { new: true }
    ).populate('createdBy', 'fullName email');

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    res.json({
      success: true,
      message: 'Viyanjana folder updated successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error updating viyanjana folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating folder'
    });
  }
};

// @desc    Delete viyanjana folder
// @route   DELETE /api/viyanjana/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await ViyanjanaFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Delete all files in this folder first
    await ViyanjanaFile.deleteMany({ folderId: req.params.id });

    // Delete the folder
    await ViyanjanaFolder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Viyanjana folder and all its files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting viyanjana folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting folder'
    });
  }
};

// File Controllers

// @desc    Create new viyanjana file
// @route   POST /api/viyanjana/files
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

    // Verify folder exists
    const folder = await ViyanjanaFolder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    const file = new ViyanjanaFile({
      title,
      description,
      content,
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      folderId,
      createdBy: req.user.id
    });

    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Viyanjana file created successfully',
      data: file
    });
  } catch (error) {
    console.error('Error creating viyanjana file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating file'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/viyanjana/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const files = await ViyanjanaFile.find({ 
      folderId: req.params.folderId, 
      isActive: true 
    })
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title')
      .sort({ createdAt: 1 }); // Old first, new last

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error fetching viyanjana files:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching files'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/viyanjana/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await ViyanjanaFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error fetching viyanjana file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching file'
    });
  }
};

// @desc    Update viyanjana file
// @route   PUT /api/viyanjana/files/:id
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

    const file = await ViyanjanaFile.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        content, 
        attachments: attachments || [], 
        sourceLinks: sourceLinks || [],
        updatedAt: Date.now() 
      },
      { new: true }
    ).populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'Viyanjana file updated successfully',
      data: file
    });
  } catch (error) {
    console.error('Error updating viyanjana file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating file'
    });
  }
};

// @desc    Delete viyanjana file
// @route   DELETE /api/viyanjana/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await ViyanjanaFile.findByIdAndDelete(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'Viyanjana file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting viyanjana file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
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
