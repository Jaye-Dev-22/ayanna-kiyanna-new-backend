const mongoose = require('mongoose');

const PhotoBucketSchema = new mongoose.Schema({
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
  
  // Attachment (Single Image)
  attachment: {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  },
  
  // Source Links (Optional)
  sourceLinks: [{
    type: String,
    trim: true
  }],
  
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
PhotoBucketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
PhotoBucketSchema.index({ createdAt: -1 });
PhotoBucketSchema.index({ createdBy: 1 });
PhotoBucketSchema.index({ isActive: 1 });

module.exports = mongoose.model('PhotoBucket', PhotoBucketSchema);
