const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
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
  itemTotal: {
    type: Number,
    required: true,
    min: [0, 'Item total cannot be negative']
  }
});

const OrderSchema = new mongoose.Schema({
  // Order Identification
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true
  },
  
  // Order Items
  items: [OrderItemSchema],
  
  // Pricing Information
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Total discount cannot be negative']
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: [0, 'Delivery charge cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  
  // Delivery Information
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  deliveryInfo: {
    recipientName: {
      type: String,
      trim: true
    },
    contactNumber: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    }
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash_on_pickup'],
    required: true
  },
  paymentReceipts: [{
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
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['not_delivered', 'delivered'],
    default: 'not_delivered'
  },
  
  // Admin Notes
  adminNote: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Special Payment Option (Admin can mark as paid in person)
  paidInPerson: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

// Generate unique order ID
OrderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `AK-${timestamp.slice(-8)}-${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Update status timestamps
OrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = Date.now();
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = Date.now();
    }
  }
  next();
});

// Virtual for total items count
OrderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Ensure virtuals are included in JSON output
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

// Index for better query performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Order', OrderSchema);
