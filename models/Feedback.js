const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  // Basic Information
  about: {
    type: String,
    required: true,
    enum: ['Subject Related', 'System Related', 'Classes Related', 'Other'],
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Attachment (Optional - Image or PDF)
  attachment: {
    url: {
      type: String
    },
    publicId: {
      type: String
    },
    type: {
      type: String,
      enum: ['image', 'raw'] // raw for PDFs
    }
  },
  
  // User Information (Auto-filled from User schema)
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
FeedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ submittedBy: 1 });
FeedbackSchema.index({ isActive: 1 });
FeedbackSchema.index({ about: 1 });
FeedbackSchema.index({ reply: 1 }); // For filtering replied/unreplied

module.exports = mongoose.model('Feedback', FeedbackSchema);
