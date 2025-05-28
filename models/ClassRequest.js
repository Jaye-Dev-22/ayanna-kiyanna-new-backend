const mongoose = require('mongoose');

const ClassRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminResponse: {
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionDate: {
      type: Date
    },
    actionNote: {
      type: String,
      trim: true
    }
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

// Update the updatedAt field before saving
ClassRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
ClassRequestSchema.index({ student: 1 });
ClassRequestSchema.index({ class: 1 });
ClassRequestSchema.index({ status: 1 });
ClassRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ClassRequest', ClassRequestSchema);
