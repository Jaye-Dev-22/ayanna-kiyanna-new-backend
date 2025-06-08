const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  priceAtTime: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  discountAtTime: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [CartItemSchema],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for total items count
CartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for subtotal (before discount)
CartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((total, item) => {
    return total + (item.priceAtTime * item.quantity);
  }, 0);
});

// Virtual for total discount amount
CartSchema.virtual('totalDiscount').get(function () {
  return this.items.reduce((total, item) => {
    const discountAmount = (item.priceAtTime * item.discountAtTime / 100) * item.quantity;
    return total + discountAmount;
  }, 0);
});

// Virtual for total amount (after discount)
CartSchema.virtual('totalAmount').get(function () {
  return this.subtotal - this.totalDiscount;
});

// Virtual for item total (for individual cart items)
CartItemSchema.virtual('itemTotal').get(function () {
  const discountAmount = this.priceAtTime * this.discountAtTime / 100;
  const discountedPrice = this.priceAtTime - discountAmount;
  return discountedPrice * this.quantity;
});

// Ensure virtuals are included in JSON output
CartSchema.set('toJSON', { virtuals: true });
CartSchema.set('toObject', { virtuals: true });
CartItemSchema.set('toJSON', { virtuals: true });
CartItemSchema.set('toObject', { virtuals: true });

// Update the updatedAt field before saving
CartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
CartSchema.index({ user: 1 });
CartSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Cart', CartSchema);
