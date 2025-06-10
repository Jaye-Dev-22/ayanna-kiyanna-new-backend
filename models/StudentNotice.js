const mongoose = require('mongoose');

const StudentNoticeSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  content2: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  
  // Attachments (Multiple Images or PDFs)
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

  // Source Links (Optional)
  sourceLinks: [{
    type: String,
    trim: true
  }],
  
  // Creator Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
StudentNoticeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
StudentNoticeSchema.index({ createdAt: -1 });
StudentNoticeSchema.index({ createdBy: 1 });
StudentNoticeSchema.index({ isActive: 1 });

module.exports = mongoose.model('StudentNotice', StudentNoticeSchema);
