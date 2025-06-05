const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  // Basic Assignment Information
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
  
  // Assignment Tasks (Optional, can add multiple)
  tasks: [{
    taskNumber: {
      type: Number,
      required: true
    },
    taskDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  }],
  
  // File Attachments (Optional - PDFs or Images)
  attachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
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
  
  // Assignment Guidelines (Optional, can add multiple)
  guidelines: [{
    guidelineNumber: {
      type: Number,
      required: true
    },
    guidelineText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  }],
  
  // Class and Creator Information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Assignment Status and Dates
  isPublished: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    required: false // Optional due date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date
  }
});

// Update the updatedAt field before saving
AssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set publishedAt when assignment is published for the first time
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  next();
});

// Index for better query performance
AssignmentSchema.index({ classId: 1 });
AssignmentSchema.index({ createdBy: 1 });
AssignmentSchema.index({ isPublished: 1 });
AssignmentSchema.index({ createdAt: -1 });

// Virtual for submission count (will be populated when needed)
AssignmentSchema.virtual('submissionCount', {
  ref: 'AssignmentSubmission',
  localField: '_id',
  foreignField: 'assignmentId',
  count: true
});

// Ensure virtuals are included in JSON output
AssignmentSchema.set('toJSON', { virtuals: true });
AssignmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
