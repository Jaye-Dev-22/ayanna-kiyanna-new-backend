const mongoose = require('mongoose');

const ExamMarkSchema = new mongoose.Schema({
  // Exam and Student References
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  // Mark Information
  marks: {
    type: Number,
    required: true,
    min: [0, 'Marks cannot be negative'],
    max: [100, 'Marks cannot exceed 100']
  },
  
  // Additional Information
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Admin who assigned the marks
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
ExamMarkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure one mark per student per exam
ExamMarkSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Index for better query performance
ExamMarkSchema.index({ examId: 1 });
ExamMarkSchema.index({ studentId: 1 });

module.exports = mongoose.model('ExamMark', ExamMarkSchema);
