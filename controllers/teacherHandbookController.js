const TeacherHandbookFolder = require('../models/TeacherHandbookFolder');
const TeacherHandbookFile = require('../models/TeacherHandbookFile');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Folder Controllers

// @desc    Create new teacher handbook folder
// @route   POST /api/teacher-handbook/folders
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

    const folder = new TeacherHandbookFolder({
      title,
      description,
      createdBy: req.user.id
    });

    await folder.save();
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Teacher handbook folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error creating teacher handbook folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating folder'
    });
  }
};

// @desc    Get all teacher handbook folders
// @route   GET /api/teacher-handbook/folders
// @access  Private
const getAllFolders = async (req, res) => {
  try {
    const folders = await TeacherHandbookFolder.find()
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }); // Sort by creation date (oldest first)

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching teacher handbook folders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folders'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/teacher-handbook/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await TeacherHandbookFolder.findById(req.params.id)
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
    console.error('Error fetching teacher handbook folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folder'
    });
  }
};

// @desc    Update teacher handbook folder
// @route   PUT /api/teacher-handbook/folders/:id
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

    const folder = await TeacherHandbookFolder.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email');

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error updating teacher handbook folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating folder'
    });
  }
};

// @desc    Delete teacher handbook folder
// @route   DELETE /api/teacher-handbook/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await TeacherHandbookFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Delete all files in this folder first
    const files = await TeacherHandbookFile.find({ folder: req.params.id });
    
    // Delete attachments from Cloudinary
    for (const file of files) {
      for (const attachment of file.attachments) {
        try {
          await cloudinary.uploader.destroy(attachment.publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }
    }

    // Delete all files
    await TeacherHandbookFile.deleteMany({ folder: req.params.id });

    // Delete the folder
    await TeacherHandbookFolder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Folder and all its contents deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher handbook folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting folder'
    });
  }
};

// File Controllers

// @desc    Create new teacher handbook file
// @route   POST /api/teacher-handbook/files
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

    const { title, description, content, attachments, sourceLinks, folder } = req.body;

    // Validate that folder exists
    const folderExists = await TeacherHandbookFolder.findById(folder);
    if (!folderExists) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Validate that at least one attachment or source link is provided
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const hasSourceLinks = sourceLinks && Array.isArray(sourceLinks) && sourceLinks.length > 0 &&
                          sourceLinks.some(link => link.title && link.url);

    if (!hasAttachments && !hasSourceLinks) {
      return res.status(400).json({
        success: false,
        message: 'At least one attachment or source link is required'
      });
    }

    const file = new TeacherHandbookFile({
      title,
      description,
      content,
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      folder,
      createdBy: req.user.id
    });

    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folder', select: 'title' }
    ]);

    res.status(201).json({
      success: true,
      message: 'File created successfully',
      data: file
    });
  } catch (error) {
    console.error('Error creating teacher handbook file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating file'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/teacher-handbook/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const files = await TeacherHandbookFile.find({ folder: req.params.folderId })
      .populate('createdBy', 'fullName email')
      .populate('folder', 'title')
      .sort({ createdAt: 1 }); // Sort by creation date (oldest first)

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error fetching teacher handbook files:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching files'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/teacher-handbook/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await TeacherHandbookFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folder', 'title');

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
    console.error('Error fetching teacher handbook file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching file'
    });
  }
};

// @desc    Update teacher handbook file
// @route   PUT /api/teacher-handbook/files/:id
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

    // Validate that at least one attachment or source link is provided
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const hasSourceLinks = sourceLinks && Array.isArray(sourceLinks) && sourceLinks.length > 0 &&
                          sourceLinks.some(link => link.title && link.url);

    if (!hasAttachments && !hasSourceLinks) {
      return res.status(400).json({
        success: false,
        message: 'At least one attachment or source link is required'
      });
    }

    const file = await TeacherHandbookFile.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        content,
        attachments: attachments || [],
        sourceLinks: sourceLinks || []
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folder', select: 'title' }
    ]);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File updated successfully',
      data: file
    });
  } catch (error) {
    console.error('Error updating teacher handbook file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating file'
    });
  }
};

// @desc    Delete teacher handbook file
// @route   DELETE /api/teacher-handbook/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await TeacherHandbookFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete attachments from Cloudinary
    for (const attachment of file.attachments) {
      try {
        await cloudinary.uploader.destroy(attachment.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    // Delete the file
    await TeacherHandbookFile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher handbook file:', error);
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
