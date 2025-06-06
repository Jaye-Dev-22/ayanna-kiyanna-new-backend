const mongoose = require('mongoose');

const GradeFolderSchema = new mongoose.Schema({
  // Basic Folder Information
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
    maxlength: 1000
  },
  
  // Grade Category
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
  
  // Folder Status
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
GradeFolderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying by grade category
GradeFolderSchema.index({ gradeCategory: 1, createdAt: 1 });

module.exports = mongoose.model('GradeFolder', GradeFolderSchema);
