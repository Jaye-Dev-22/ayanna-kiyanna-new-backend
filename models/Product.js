const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Basic Product Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['Books', 'T-shirts', 'Caps', 'Magazines', 'Others'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  part: {
    type: String,
    trim: true,
    maxlength: 100
  },
  publisherAuthor: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Images (Maximum 5 images using Cloudinary)
  images: [{
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
    }
  }],
  
  // Pricing Information
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  
  // Inventory
  availableQuantity: {
    type: Number,
    required: true,
    min: [0, 'Available quantity cannot be negative'],
    default: 0
  },
  
  // Product Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Virtual for discounted price
ProductSchema.virtual('discountedPrice').get(function () {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount / 100);
  }
  return this.price;
});

// Virtual for savings amount
ProductSchema.virtual('savingsAmount').get(function () {
  if (this.discount > 0) {
    return this.price * this.discount / 100;
  }
  return 0;
});

// Ensure virtuals are included in JSON output
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

// Update the updatedAt field before saving
ProductSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema);
