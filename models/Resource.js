const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  // Basic Resource Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // File Attachments (Optional - Images, PDFs)
  attachments: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['pdf', 'image'],
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  }],
  
  // External Links (Optional - Audio, Video, Special Links)
  externalLinks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Basic URL validation
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Please enter a valid URL'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  
  // Class and Creator Information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Resource Status
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
ResourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
ResourceSchema.index({ classId: 1, createdAt: -1 });
ResourceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Resource', ResourceSchema);
