const mongoose = require('mongoose');

const OnlineSessionSchema = new mongoose.Schema({
  // Basic Information
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
  
  // Meeting Information
  meetingLink: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Meeting link must be a valid URL'
    }
  },
  meetingId: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Schedule Information
  sessionDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validate HH:MM format
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validate HH:MM format
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  
  // Guidelines (array of strings)
  guidelines: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  
  // Additional Information
  additionalNote: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Class Association
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
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
OnlineSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
OnlineSessionSchema.index({ classId: 1, sessionDate: 1 });
OnlineSessionSchema.index({ createdBy: 1 });
OnlineSessionSchema.index({ isActive: 1 });

// Virtual for session status based on current time
OnlineSessionSchema.virtual('sessionStatus').get(function() {
  const now = new Date();
  const sessionDateTime = new Date(this.sessionDate);
  
  // Parse start and end times
  const [startHour, startMinute] = this.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.endTime.split(':').map(Number);
  
  const startDateTime = new Date(sessionDateTime);
  startDateTime.setHours(startHour, startMinute, 0, 0);
  
  const endDateTime = new Date(sessionDateTime);
  endDateTime.setHours(endHour, endMinute, 0, 0);
  
  if (now < startDateTime) {
    return 'upcoming';
  } else if (now >= startDateTime && now <= endDateTime) {
    return 'live';
  } else {
    return 'ended';
  }
});

// Virtual for formatted date
OnlineSessionSchema.virtual('formattedDate').get(function() {
  return this.sessionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time range
OnlineSessionSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Ensure virtual fields are serialized
OnlineSessionSchema.set('toJSON', { virtuals: true });
OnlineSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OnlineSession', OnlineSessionSchema);
