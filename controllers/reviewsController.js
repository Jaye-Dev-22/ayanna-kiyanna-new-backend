const { validationResult } = require('express-validator');
const ReviewsFolder = require('../models/ReviewsFolder');
const ReviewsFile = require('../models/ReviewsFile');
const ReviewsComment = require('../models/ReviewsComment');

// Folder Controllers
const createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { title, description } = req.body;
    const folder = new ReviewsFolder({ title, description, createdBy: req.user.id });
    await folder.save();
    await folder.populate('createdBy', 'fullName email');
    res.status(201).json({ success: true, message: 'Folder created successfully', data: folder });
  } catch (error) {
    console.error('Error creating reviews folder:', error);
    res.status(500).json({ success: false, message: 'Server error while creating folder' });
  }
};

const getAllFolders = async (req, res) => {
  try {
    const folders = await ReviewsFolder.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: folders });
  } catch (error) {
    console.error('Error fetching reviews folders:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching folders' });
  }
};

const getFolderById = async (req, res) => {
  try {
    const folder = await ReviewsFolder.findById(req.params.id)
      .populate('createdBy', 'fullName email');
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, data: folder });
  } catch (error) {
    console.error('Error fetching reviews folder:', error);
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
    const folder = await ReviewsFolder.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    ).populate('createdBy', 'fullName email');

    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, message: 'Folder updated successfully', data: folder });
  } catch (error) {
    console.error('Error updating reviews folder:', error);
    res.status(500).json({ success: false, message: 'Server error while updating folder' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await ReviewsFolder.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reviews folder:', error);
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
    const folder = await ReviewsFolder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Attachments and source links are optional

    const file = new ReviewsFile({
      title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [], folderId, createdBy: req.user.id
    });
    await file.save();
    await file.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);
    res.status(201).json({ success: true, message: 'File created successfully', data: file });
  } catch (error) {
    console.error('Error creating reviews file:', error);
    res.status(500).json({ success: false, message: 'Server error while creating file' });
  }
};

const getFolderFiles = async (req, res) => {
  try {
    const files = await ReviewsFile.find({ folderId: req.params.folderId, isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching reviews files:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching files' });
  }
};

const getFileById = async (req, res) => {
  try {
    const file = await ReviewsFile.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('folderId', 'title')
      .populate('likes.user', 'fullName email');
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error fetching reviews file:', error);
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
    // Attachments and source links are optional

    const file = await ReviewsFile.findByIdAndUpdate(
      req.params.id,
      { title, description, content, attachments: attachments || [], sourceLinks: sourceLinks || [] },
      { new: true }
    ).populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'folderId', select: 'title' }
    ]);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, message: 'File updated successfully', data: file });
  } catch (error) {
    console.error('Error updating reviews file:', error);
    res.status(500).json({ success: false, message: 'Server error while updating file' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await ReviewsFile.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting reviews file:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting file' });
  }
};

// Like/Unlike functionality
const toggleLike = async (req, res) => {
  try {
    const file = await ReviewsFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const existingLike = file.likes.find(like => like.user.toString() === req.user.id);
    const wasLiked = !!existingLike;

    let updatedFile;
    if (existingLike) {
      // Unlike - remove the like
      updatedFile = await ReviewsFile.findByIdAndUpdate(
        req.params.id,
        { $pull: { likes: { user: req.user.id } } },
        { new: true }
      ).populate('likes.user', 'fullName email');
    } else {
      // Like - add the like
      updatedFile = await ReviewsFile.findByIdAndUpdate(
        req.params.id,
        { $push: { likes: { user: req.user.id } } },
        { new: true }
      ).populate('likes.user', 'fullName email');
    }

    res.json({
      success: true,
      data: {
        likes: updatedFile.likes,
        isLiked: !wasLiked
      }
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Server error while toggling like' });
  }
};

// Comment functionality
const addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { content, parentComment } = req.body;
    const comment = new ReviewsComment({
      content,
      fileId: req.params.id,
      user: req.user.id,
      parentComment: parentComment || null
    });

    await comment.save();
    await comment.populate('user', 'fullName email');

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      await ReviewsComment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }

    res.status(201).json({ success: true, message: 'Comment added successfully', data: comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Server error while adding comment' });
  }
};

const getFileComments = async (req, res) => {
  try {
    const comments = await ReviewsComment.find({
      fileId: req.params.id,
      isActive: true,
      parentComment: null // Only get top-level comments
    })
      .populate('user', 'fullName email')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'fullName email' }
      })
      .sort({ createdAt: 1 });

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching comments' });
  }
};

const updateComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { content } = req.body;
    const comment = await ReviewsComment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate('user', 'fullName email');

    res.json({ success: true, message: 'Comment updated successfully', data: comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ success: false, message: 'Server error while updating comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await ReviewsComment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user owns the comment or is admin
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.isActive = false;
    await comment.save();

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting comment' });
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
  deleteFile,
  toggleLike,
  addComment,
  getFileComments,
  updateComment,
  deleteComment
};
