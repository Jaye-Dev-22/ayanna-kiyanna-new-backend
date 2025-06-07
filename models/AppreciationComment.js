const mongoose = require('mongoose');

const AppreciationCommentSchema = new mongoose.Schema({
  // Comment Content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // File Association
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppreciationFile',
    required: true
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Parent Comment (for replies)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppreciationComment',
    default: null
  },
  
  // Replies to this comment
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppreciationComment'
  }],
  
  // Comment Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Edit History
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
AppreciationCommentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
AppreciationCommentSchema.index({ fileId: 1, createdAt: 1 });
AppreciationCommentSchema.index({ user: 1 });
AppreciationCommentSchema.index({ parentComment: 1 });
AppreciationCommentSchema.index({ isActive: 1 });

module.exports = mongoose.model('AppreciationComment', AppreciationCommentSchema);
