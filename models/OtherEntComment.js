const mongoose = require('mongoose');

const OtherEntCommentSchema = new mongoose.Schema({
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
    ref: 'OtherEntFile',
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
    ref: 'OtherEntComment',
    default: null
  },
  
  // Replies to this comment
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OtherEntComment'
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
OtherEntCommentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
OtherEntCommentSchema.index({ fileId: 1, createdAt: 1 });
OtherEntCommentSchema.index({ user: 1 });
OtherEntCommentSchema.index({ parentComment: 1 });
OtherEntCommentSchema.index({ isActive: 1 });

module.exports = mongoose.model('OtherEntComment', OtherEntCommentSchema);
