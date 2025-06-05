const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isDone: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const TimeScheduleSchema = new mongoose.Schema({
  // Class Information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  // Time Period Information
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2050
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Tasks for the week
  tasks: [TaskSchema],
  
  // Optional note for the week
  note: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Creator Information
  createdBy: {
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
TimeScheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update task updatedAt when tasks are modified
  if (this.isModified('tasks')) {
    this.tasks.forEach(task => {
      if (task.isModified()) {
        task.updatedAt = Date.now();
      }
    });
  }
  
  next();
});

// Compound index to ensure unique schedule per class, year, month, week
TimeScheduleSchema.index({ classId: 1, year: 1, month: 1, week: 1 }, { unique: true });

// Index for better query performance
TimeScheduleSchema.index({ classId: 1, createdAt: -1 });
TimeScheduleSchema.index({ createdBy: 1 });

// Virtual for completed tasks count
TimeScheduleSchema.virtual('completedTasksCount').get(function() {
  return this.tasks ? this.tasks.filter(task => task.isDone).length : 0;
});

// Virtual for total tasks count
TimeScheduleSchema.virtual('totalTasksCount').get(function() {
  return this.tasks ? this.tasks.length : 0;
});

// Virtual for completion percentage
TimeScheduleSchema.virtual('completionPercentage').get(function() {
  const total = this.totalTasksCount;
  if (total === 0) return 0;
  return Math.round((this.completedTasksCount / total) * 100);
});

// Ensure virtuals are included in JSON output
TimeScheduleSchema.set('toJSON', { virtuals: true });
TimeScheduleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TimeSchedule', TimeScheduleSchema);
