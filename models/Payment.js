const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Student reference
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },

  // Class reference
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },

  // Payment period
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

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Receipt information
  receiptUrl: {
    type: String,
    required: true,
    trim: true
  },
  receiptPublicId: {
    type: String,
    required: true,
    trim: true
  },

  // Additional note from student
  additionalNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Additional note cannot exceed 500 characters']
  },

  // Payment status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },

  // Admin action details
  adminAction: {
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionDate: {
      type: Date
    },
    actionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Action note cannot exceed 500 characters']
    }
  },

  // Attendance data at time of payment
  attendanceData: {
    presentDays: {
      type: Number,
      required: true,
      min: 0
    },
    totalClassDays: {
      type: Number,
      required: true,
      min: 0
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
  }
});

// Update the updatedAt field before saving
PaymentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index to prevent duplicate payments for same student, class, year, month
PaymentSchema.index({ studentId: 1, classId: 1, year: 1, month: 1 }, { unique: true });

// Index for better query performance
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ year: 1, month: 1 });
PaymentSchema.index({ classId: 1, year: 1, month: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
