const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Normal', 'Special'],
    required: true
  },
  grade: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    // For Normal classes: weekday (Sunday, Monday, etc.)
    // For Special classes: specific date
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
  },
  venue: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1'],
    max: [500, 'Capacity cannot exceed 500']
  },
  specialNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Special note cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
ClassSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for enrolled count
ClassSchema.virtual('enrolledCount').get(function() {
  return this.enrolledStudents.length;
});

// Virtual for available spots
ClassSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.enrolledStudents.length;
});

// Ensure virtuals are included in JSON output
ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });

// Index for better query performance
ClassSchema.index({ type: 1, grade: 1, isActive: 1 });
ClassSchema.index({ createdBy: 1 });
ClassSchema.index({ date: 1, startTime: 1 });

module.exports = mongoose.model('Class', ClassSchema);
