const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  // Assignment and Student References
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  // Submission Content
  submissionText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // File Attachments (Optional - Images or PDFs, max 5)
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
  
  // Grading Information
  marks: {
    type: Number,
    min: 0,
    max: 100,
    default: null // null means not graded yet
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  
  // Status and Dates
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Validation: Maximum 5 attachments
AssignmentSubmissionSchema.pre('save', function(next) {
  if (this.attachments && this.attachments.length > 5) {
    const error = new Error('Maximum 5 attachments allowed per submission');
    error.name = 'ValidationError';
    return next(error);
  }
  
  this.updatedAt = Date.now();
  
  // Set gradedAt when marks are assigned for the first time
  if (this.marks !== null && this.marks !== undefined && !this.gradedAt) {
    this.gradedAt = Date.now();
    this.status = 'graded';
  }
  
  next();
});

// Compound index to ensure one submission per student per assignment
AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

// Index for better query performance
AssignmentSubmissionSchema.index({ assignmentId: 1 });
AssignmentSubmissionSchema.index({ studentId: 1 });
AssignmentSubmissionSchema.index({ status: 1 });
AssignmentSubmissionSchema.index({ submittedAt: -1 });
AssignmentSubmissionSchema.index({ gradedAt: -1 });

// Virtual for late submission check
AssignmentSubmissionSchema.virtual('isLateSubmission').get(function() {
  if (!this.populated('assignmentId') || !this.assignmentId.dueDate) {
    return false;
  }
  return this.submittedAt > this.assignmentId.dueDate;
});

// Ensure virtuals are included in JSON output
AssignmentSubmissionSchema.set('toJSON', { virtuals: true });
AssignmentSubmissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
