const mongoose = require('mongoose');

const StudentMessageSchema = new mongoose.Schema({
  // Basic Information
  about: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Attachments (Multiple Images or PDFs - Max 5)
  attachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'raw'], // raw for PDFs
      required: true
    },
    originalName: {
      type: String
    }
  }],
  
  // Student Information (Auto-filled from User schema)
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Admin Reply
  reply: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  replyAttachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'raw'], // raw for PDFs
      required: true
    },
    originalName: {
      type: String
    }
  }],
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
StudentMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validation for maximum 5 attachments
StudentMessageSchema.pre('save', function(next) {
  if (this.attachments && this.attachments.length > 5) {
    const error = new Error('Maximum 5 attachments are allowed');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Index for better query performance
StudentMessageSchema.index({ createdAt: -1 });
StudentMessageSchema.index({ submittedBy: 1 });
StudentMessageSchema.index({ isActive: 1 });
StudentMessageSchema.index({ reply: 1 }); // For filtering replied/unreplied

module.exports = mongoose.model('StudentMessage', StudentMessageSchema);
