const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  // Basic Exam Information
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
  
  // Exam Guidelines (Optional, can add multiple)
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
  
  // Exam Link (Optional - Google Forms, etc.)
  examLink: {
    type: String,
    trim: true,
    default: undefined,
    validate: {
      validator: function(v) {
        if (!v || v === '') return true; // Allow empty
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  
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
  
  // Exam Status and Dates
  isPublished: {
    type: Boolean,
    default: false
  },
  examDate: {
    type: Date,
    required: false // Optional exam date
  },
  examTime: {
    type: String,
    required: false, // Optional exam time
    validate: {
      validator: function(v) {
        if (!v || v === '') return true; // Allow empty
        // Time format validation (HH:MM)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Please enter a valid time in HH:MM format'
    }
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
ExamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

// Index for better query performance
ExamSchema.index({ classId: 1, createdAt: -1 });
ExamSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Exam', ExamSchema);
