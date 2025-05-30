const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  // Class reference
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  // Attendance date
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Admin who created the attendance sheet
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Admin's expected present count
  expectedPresentCount: {
    type: Number,
    required: true,
    min: [0, 'Expected present count cannot be negative']
  },
  
  // Monitor permissions
  monitorPermissions: {
    // Whether all monitors have permission
    allMonitors: {
      type: Boolean,
      default: false
    },
    // Specific monitors with permission
    selectedMonitors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }],
    default: []
  },
  
  // Student attendance records
  studentAttendance: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      default: 'Absent'
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    markedAt: {
      type: Date
    }
  }],
  
  // Attendance sheet status
  status: {
    type: String,
    enum: ['Draft', 'Completed', 'Updated'],
    default: 'Draft'
  },
  
  // Monitor update tracking
  monitorUpdate: {
    // Which monitor updated (if any)
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    // When it was updated
    updatedAt: {
      type: Date
    },
    // Present count marked by monitor
    markedPresentCount: {
      type: Number,
      min: [0, 'Marked present count cannot be negative']
    },
    // Whether the update is locked (prevents other monitors from updating)
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  
  // Admin notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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
AttendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for actual present count
AttendanceSchema.virtual('actualPresentCount').get(function() {
  return this.studentAttendance ? 
    this.studentAttendance.filter(record => record.status === 'Present').length : 0;
});

// Virtual for total students
AttendanceSchema.virtual('totalStudents').get(function() {
  return this.studentAttendance ? this.studentAttendance.length : 0;
});

// Virtual for attendance percentage
AttendanceSchema.virtual('attendancePercentage').get(function() {
  const total = this.totalStudents;
  const present = this.actualPresentCount;
  return total > 0 ? Math.round((present / total) * 100) : 0;
});

// Method to check if a monitor can update attendance
AttendanceSchema.methods.canMonitorUpdate = function(monitorId) {
  // Check if monitor update is already locked by another monitor
  if (this.monitorUpdate.isLocked && 
      this.monitorUpdate.updatedBy && 
      this.monitorUpdate.updatedBy.toString() !== monitorId.toString()) {
    return false;
  }
  
  // Check if monitor has permission
  if (this.monitorPermissions.allMonitors) {
    return true;
  }
  
  return this.monitorPermissions.selectedMonitors.some(
    monitor => monitor.toString() === monitorId.toString()
  );
};

// Method to lock monitor updates
AttendanceSchema.methods.lockMonitorUpdate = function(monitorId, presentCount) {
  this.monitorUpdate.updatedBy = monitorId;
  this.monitorUpdate.updatedAt = new Date();
  this.monitorUpdate.markedPresentCount = presentCount;
  this.monitorUpdate.isLocked = true;
  this.status = 'Updated';
};

// Ensure virtuals are included in JSON output
AttendanceSchema.set('toJSON', { virtuals: true });
AttendanceSchema.set('toObject', { virtuals: true });

// Index for better query performance
AttendanceSchema.index({ classId: 1, date: 1 });
AttendanceSchema.index({ createdBy: 1 });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ status: 1 });

// Compound index for monthly queries
AttendanceSchema.index({ 
  classId: 1, 
  date: 1 
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
