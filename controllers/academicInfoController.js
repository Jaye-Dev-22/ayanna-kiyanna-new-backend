const AcademicInfoFolder = require('../models/AcademicInfoFolder');
const AcademicInfoFile = require('../models/AcademicInfoFile');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: 'dl9k5qoae', api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    const { title, description } = req.body;
    const folder = new AcademicInfoFolder({ title, description, createdBy: req.user.id });
    await folder.save();
    await folder.populate('createdBy', 'fullName email');
    res.status(201).json({ success: true, message: 'Academic info folder created successfully', data: folder });
  } catch (error) {
    console.error('Error creating academic info folder:', error);
    res.status(500).json({ success: false, message: 'Server error while creating folder' });
  }
};

const getAllFolders = async (req, res) => {
  try {
    const folders = await AcademicInfoFolder.find().populate('createdBy', 'fullName email').sort({ createdAt: 1 });
    res.json({ success: true, data: folders });
  } catch (error) {
    console.error('Error fetching academic info folders:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching folders' });
  }
};

const getFolderById = async (req, res) => {
  try {
    const folder = await AcademicInfoFolder.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    res.json({ success: true, data: folder });
  } catch (error) {
    console.error('Error fetching academic info folder:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching folder' });
  }
};

const updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    const { title, description } = req.body;
    const folder = await AcademicInfoFolder.findByIdAndUpdate(req.params.id, { title, description }, { new: true, runValidators: true }).populate('createdBy', 'fullName email');
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    res.json({ success: true, message: 'Folder updated successfully', data: folder });
  } catch (error) {
    console.error('Error updating academic info folder:', error);
    res.status(500).json({ success: false, message: 'Server error while updating folder' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await AcademicInfoFolder.findById(req.params.id);
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    const files = await AcademicInfoFile.find({ folder: req.params.id });
    for (const file of files) {
      for (const attachment of file.attachments) {
        try { await cloudinary.uploader.destroy(attachment.publicId); } catch (e) { console.error('Cloudinary error:', e); }
      }
    }
    await AcademicInfoFile.deleteMany({ folder: req.params.id });
    await AcademicInfoFolder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Folder and all its contents deleted successfully' });
  } catch (error) {
    console.error('Error deleting academic info folder:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting folder' });
  }
};

const createFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    const { title, description, content, attachments, sourceLinks, folder } = req.body;
    const folderExists = await AcademicInfoFolder.findById(folder);
    if (!folderExists) return res.status(404).json({ success: false, message: 'Folder not found' });
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const hasSourceLinks = sourceLinks && Array.isArray(sourceLinks) && sourceLinks.length > 0 &&
                          sourceLinks.some(link => link.title && link.url);

    if (!hasAttachments && !hasSourceLinks) {
      return res.status(400).json({ success: false, message: 'At least one attachment or source link is required' });
    }
    const file = new AcademicInfoFile({ title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [], folder, createdBy: req.user.id });
    await file.save();
    await file.populate([{ path: 'createdBy', select: 'fullName email' }, { path: 'folder', select: 'title' }]);
    res.status(201).json({ success: true, message: 'File created successfully', data: file });
  } catch (error) {
    console.error('Error creating academic info file:', error);
    res.status(500).json({ success: false, message: 'Server error while creating file' });
  }
};

const getFolderFiles = async (req, res) => {
  try {
    const files = await AcademicInfoFile.find({ folder: req.params.folderId }).populate('createdBy', 'fullName email').populate('folder', 'title').sort({ createdAt: 1 });
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching academic info files:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching files' });
  }
};

const getFileById = async (req, res) => {
  try {
    const file = await AcademicInfoFile.findById(req.params.id).populate('createdBy', 'fullName email').populate('folder', 'title');
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error fetching academic info file:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching file' });
  }
};

const updateFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    const { title, description, content, attachments, sourceLinks } = req.body;
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const hasSourceLinks = sourceLinks && Array.isArray(sourceLinks) && sourceLinks.length > 0 &&
                          sourceLinks.some(link => link.title && link.url);

    if (!hasAttachments && !hasSourceLinks) {
      return res.status(400).json({ success: false, message: 'At least one attachment or source link is required' });
    }
    const file = await AcademicInfoFile.findByIdAndUpdate(req.params.id, { title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [] }, { new: true, runValidators: true }).populate([{ path: 'createdBy', select: 'fullName email' }, { path: 'folder', select: 'title' }]);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, message: 'File updated successfully', data: file });
  } catch (error) {
    console.error('Error updating academic info file:', error);
    res.status(500).json({ success: false, message: 'Server error while updating file' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await AcademicInfoFile.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    for (const attachment of file.attachments) {
      try { await cloudinary.uploader.destroy(attachment.publicId); } catch (e) { console.error('Cloudinary error:', e); }
    }
    await AcademicInfoFile.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting academic info file:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting file' });
  }
};

module.exports = { createFolder, getAllFolders, getFolderById, updateFolder, deleteFolder, createFile, getFolderFiles, getFileById, updateFile, deleteFile };
