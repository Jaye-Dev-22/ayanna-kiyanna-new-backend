const { validationResult } = require('express-validator');
const SwaraFolder = require('../models/SwaraFolder');
const SwaraFile = require('../models/SwaraFile');

// Folder Controllers

// @desc    Create new swara folder
// @route   POST /api/swara/folders
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

    const folder = new SwaraFolder({
      title,
      description,
      createdBy: req.user.id
    });

    await folder.save();
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Swara folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error creating swara folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating folder'
    });
  }
};

// @desc    Get all swara folders
// @route   GET /api/swara/folders
// @access  Private
const getAllFolders = async (req, res) => {
  try {
    const folders = await SwaraFolder.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }); // Old first, new last

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching swara folders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folders'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/swara/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await SwaraFolder.findById(req.params.id)
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
    console.error('Error fetching swara folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folder'
    });
  }
};

// @desc    Update swara folder
// @route   PUT /api/swara/folders/:id
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

    const folder = await SwaraFolder.findByIdAndUpdate(
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
      message: 'Swara folder updated successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error updating swara folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating folder'
    });
  }
};

// @desc    Delete swara folder
// @route   DELETE /api/swara/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await SwaraFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Delete all files in this folder first
    await SwaraFile.deleteMany({ folderId: req.params.id });

    // Delete the folder
    await SwaraFolder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Swara folder and all its files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting swara folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting folder'
    });
  }
};

// File Controllers

// @desc    Create new swara file
// @route   POST /api/swara/files
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
    const folder = await SwaraFolder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    const file = new SwaraFile({
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
      message: 'Swara file created successfully',
      data: file
    });
  } catch (error) {
    console.error('Error creating swara file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating file'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/swara/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const files = await SwaraFile.find({ 
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
    console.error('Error fetching swara files:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching files'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/swara/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await SwaraFile.findById(req.params.id)
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
    console.error('Error fetching swara file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching file'
    });
  }
};

// @desc    Update swara file
// @route   PUT /api/swara/files/:id
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

    const file = await SwaraFile.findByIdAndUpdate(
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
      message: 'Swara file updated successfully',
      data: file
    });
  } catch (error) {
    console.error('Error updating swara file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating file'
    });
  }
};

// @desc    Delete swara file
// @route   DELETE /api/swara/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await SwaraFile.findByIdAndDelete(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'Swara file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting swara file:', error);
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
