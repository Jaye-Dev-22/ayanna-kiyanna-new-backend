const mongoose = require('mongoose');

const paperBankSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  grade: {
    type: String,
    required: true,
    enum: ['Grade 9', 'Grade 10', 'Grade 11', 'A/L', 'සිංහල සාහිත්‍ය (කාණ්ඩ විෂය)']
  },
  paperType: {
    type: String,
    required: true,
    enum: ['Past Paper', 'Model Paper', 'Other']
  },
  paperYear: {
    type: String,
    required: true,
    trim: true
  },
  paperPart: {
    type: String,
    required: true,
    enum: ['Part 1', 'Part 2', 'Part 3', 'Full Paper', 'Other']
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    }
  }],
  sourceLinks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index for better query performance
paperBankSchema.index({ grade: 1, paperType: 1, paperYear: 1, paperPart: 1 });
paperBankSchema.index({ createdAt: 1 });
paperBankSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
paperBankSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PaperBank', paperBankSchema);
