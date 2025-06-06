const mongoose = require('mongoose');

const GradeFileSchema = new mongoose.Schema({
  // Basic File Information
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
  
  // Optional Content (Text content)
  content: {
    type: String,
    trim: true,
    maxlength: 10000
  },
  
  // File Attachments (Optional - Images, PDFs)
  attachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['pdf', 'image'],
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  }],
  
  // Source Links (Optional - External links for references)
  sourceLinks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Basic URL validation
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Please enter a valid URL'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  
  // Folder Association
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GradeFolder',
    required: true
  },
  
  // Grade Category (for easier querying)
  gradeCategory: {
    type: String,
    required: true,
    enum: ['grade-9', 'grade-10', 'grade-11', 'a-level', 'sinhala-literature'],
    index: true
  },
  
  // Creator Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // File Status
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
GradeFileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
GradeFileSchema.index({ gradeCategory: 1, folderId: 1, createdAt: 1 });

module.exports = mongoose.model('GradeFile', GradeFileSchema);
