const SubjectGuidelinesFolder = require('../models/SubjectGuidelinesFolder');
const SubjectGuidelinesFile = require('../models/SubjectGuidelinesFile');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Folder Controllers

// @desc    Create new subject guidelines folder
// @route   POST /api/subject-guidelines/folders
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

    const folder = new SubjectGuidelinesFolder({
      title,
      description,
      createdBy: req.user.id
    });

    await folder.save();
    await folder.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Subject guidelines folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Error creating subject guidelines folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating folder'
    });
  }
};

// @desc    Get all subject guidelines folders
// @route   GET /api/subject-guidelines/folders
// @access  Private
const getAllFolders = async (req, res) => {
  try {
    const folders = await SubjectGuidelinesFolder.find()
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }); // Sort by creation date (oldest first)

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching subject guidelines folders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folders'
    });
  }
};

// @desc    Get folder by ID
// @route   GET /api/subject-guidelines/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  try {
    const folder = await SubjectGuidelinesFolder.findById(req.params.id)
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
    console.error('Error fetching subject guidelines folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching folder'
    });
  }
};

// @desc    Update subject guidelines folder
// @route   PUT /api/subject-guidelines/folders/:id
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

    const folder = await SubjectGuidelinesFolder.findByIdAndUpdate(
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
    console.error('Error updating subject guidelines folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating folder'
    });
  }
};

// @desc    Delete subject guidelines folder
// @route   DELETE /api/subject-guidelines/folders/:id
// @access  Private (Admin/Moderator)
const deleteFolder = async (req, res) => {
  try {
    const folder = await SubjectGuidelinesFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Delete all files in this folder first
    const files = await SubjectGuidelinesFile.find({ folder: req.params.id });
    
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
    await SubjectGuidelinesFile.deleteMany({ folder: req.params.id });

    // Delete the folder
    await SubjectGuidelinesFolder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Folder and all its contents deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject guidelines folder:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting folder'
    });
  }
};

// File Controllers

// @desc    Create new subject guidelines file
// @route   POST /api/subject-guidelines/files
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
    const folderExists = await SubjectGuidelinesFolder.findById(folder);
    if (!folderExists) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Validate that at least one attachment or source link is provided
    if ((!attachments || attachments.length === 0) && (!sourceLinks || sourceLinks.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one attachment or source link is required'
      });
    }

    const file = new SubjectGuidelinesFile({
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
    console.error('Error creating subject guidelines file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating file'
    });
  }
};

// @desc    Get all files in a folder
// @route   GET /api/subject-guidelines/folders/:folderId/files
// @access  Private
const getFolderFiles = async (req, res) => {
  try {
    const files = await SubjectGuidelinesFile.find({ folder: req.params.folderId })
      .populate('createdBy', 'fullName email')
      .populate('folder', 'title')
      .sort({ createdAt: 1 }); // Sort by creation date (oldest first)

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error fetching subject guidelines files:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching files'
    });
  }
};

// @desc    Get file by ID
// @route   GET /api/subject-guidelines/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const file = await SubjectGuidelinesFile.findById(req.params.id)
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
    console.error('Error fetching subject guidelines file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching file'
    });
  }
};

// @desc    Update subject guidelines file
// @route   PUT /api/subject-guidelines/files/:id
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
    if ((!attachments || attachments.length === 0) && (!sourceLinks || sourceLinks.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one attachment or source link is required'
      });
    }

    const file = await SubjectGuidelinesFile.findByIdAndUpdate(
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
    console.error('Error updating subject guidelines file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating file'
    });
  }
};

// @desc    Delete subject guidelines file
// @route   DELETE /api/subject-guidelines/files/:id
// @access  Private (Admin/Moderator)
const deleteFile = async (req, res) => {
  try {
    const file = await SubjectGuidelinesFile.findById(req.params.id);

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
    await SubjectGuidelinesFile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject guidelines file:', error);
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
