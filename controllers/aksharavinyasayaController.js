const { validationResult } = require('express-validator');
const AksharavinyasayaFolder = require('../models/AksharavinyasayaFolder');
const AksharavinyasayaFile = require('../models/AksharavinyasayaFile');

// Folder Controllers
const createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }
    const { title, description } = req.body;
    const folder = new AksharavinyasayaFolder({ title, description, createdBy: req.user.id });
    await folder.save();
    await folder.populate('createdBy', 'fullName email');
    res.status(201).json({ success: true, message: 'Aksharavinyasaya folder created successfully', data: folder });
  } catch (error) {
    console.error('Error creating aksharavinyasaya folder:', error);
    res.status(500).json({ success: false, message: 'Server error while creating folder' });
  }
};

const getAllFolders = async (req, res) => {
  try {
    const folders = await AksharavinyasayaFolder.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: folders });
  } catch (error) {
    console.error('Error fetching aksharavinyasaya folders:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching folders' });
  }
};

const getFolderById = async (req, res) => {
  try {
    const folder = await AksharavinyasayaFolder.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, data: folder });
  } catch (error) {
    console.error('Error fetching aksharavinyasaya folder:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching folder' });
  }
};

const updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }
    const { title, description } = req.body;
    const folder = await AksharavinyasayaFolder.findByIdAndUpdate(
      req.params.id,
      { title, description, updatedAt: Date.now() },
      { new: true }
    ).populate('createdBy', 'fullName email');
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, message: 'Aksharavinyasaya folder updated successfully', data: folder });
  } catch (error) {
    console.error('Error updating aksharavinyasaya folder:', error);
    res.status(500).json({ success: false, message: 'Server error while updating folder' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await AksharavinyasayaFolder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    await AksharavinyasayaFile.deleteMany({ folderId: req.params.id });
    await AksharavinyasayaFolder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Aksharavinyasaya folder and all its files deleted successfully' });
  } catch (error) {
    console.error('Error deleting aksharavinyasaya folder:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting folder' });
  }
};

// File Controllers
const createFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }
    const { title, description, content, attachments, sourceLinks, folderId } = req.body;
    const folder = await AksharavinyasayaFolder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    const file = new AksharavinyasayaFile({
      title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [], folderId, createdBy: req.user.id
    });
    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);
    res.status(201).json({ success: true, message: 'Aksharavinyasaya file created successfully', data: file });
  } catch (error) {
    console.error('Error creating aksharavinyasaya file:', error);
    res.status(500).json({ success: false, message: 'Server error while creating file' });
  }
};

const getFolderFiles = async (req, res) => {
  try {
    const files = await AksharavinyasayaFile.find({ folderId: req.params.folderId, isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching aksharavinyasaya files:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching files' });
  }
};

const getFileById = async (req, res) => {
  try {
    const file = await AksharavinyasayaFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title');
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error fetching aksharavinyasaya file:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching file' });
  }
};

const updateFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }
    const { title, description, content, attachments, sourceLinks } = req.body;
    const file = await AksharavinyasayaFile.findByIdAndUpdate(
      req.params.id,
      { title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [], updatedAt: Date.now() },
      { new: true }
    ).populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, message: 'Aksharavinyasaya file updated successfully', data: file });
  } catch (error) {
    console.error('Error updating aksharavinyasaya file:', error);
    res.status(500).json({ success: false, message: 'Server error while updating file' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await AksharavinyasayaFile.findByIdAndDelete(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, message: 'Aksharavinyasaya file deleted successfully' });
  } catch (error) {
    console.error('Error deleting aksharavinyasaya file:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting file' });
  }
};

module.exports = {
  createFolder, getAllFolders, getFolderById, updateFolder, deleteFolder,
  createFile, getFolderFiles, getFileById, updateFile, deleteFile
};
