const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  askedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reply: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SpecialNoticeSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // Attachment (Single Image)
  attachment: {
    url: {
      type: String
    },
    publicId: {
      type: String
    }
  },

  // Source Links (Optional)
  sourceLinks: [{
    type: String,
    trim: true
  }],
  
  // Questions and Answers
  questions: [QuestionSchema],
  
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
SpecialNoticeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
SpecialNoticeSchema.index({ createdAt: -1 });
SpecialNoticeSchema.index({ createdBy: 1 });
SpecialNoticeSchema.index({ isActive: 1 });
SpecialNoticeSchema.index({ 'questions.askedBy': 1 });

module.exports = mongoose.model('SpecialNotice', SpecialNoticeSchema);
