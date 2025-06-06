const mongoose = require('mongoose');

const paperStructureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Paper Structures', 'අනුමාන', 'Others']
  },
  grade: {
    type: String,
    required: true,
    enum: ['Grade 9', 'Grade 10', 'Grade 11', 'A/L', 'සිංහල සාහිත්‍යය (කාණ්ඩ විෂය)']
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
  additionalNote: {
    type: String,
    trim: true
  },
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
paperStructureSchema.index({ type: 1, grade: 1, paperPart: 1 });
paperStructureSchema.index({ createdAt: 1 });
paperStructureSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
paperStructureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Custom validation to ensure at least one attachment or source link
paperStructureSchema.pre('save', function(next) {
  const hasAttachments = this.attachments && this.attachments.length > 0;
  const hasSourceLinks = this.sourceLinks && this.sourceLinks.length > 0;
  
  if (!hasAttachments && !hasSourceLinks) {
    const error = new Error('At least one attachment or source link is required');
    error.name = 'ValidationError';
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('PaperStructure', paperStructureSchema);
