const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  // Basic Announcement Information
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
  
  // Priority Level
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  
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
  
  // Announcement Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Expiry Date (Optional)
  expiryDate: {
    type: Date,
    required: false
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
AnnouncementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
AnnouncementSchema.index({ classId: 1, createdAt: -1 });
AnnouncementSchema.index({ isActive: 1 });
AnnouncementSchema.index({ priority: 1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
