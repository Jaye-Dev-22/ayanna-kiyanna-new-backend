const mongoose = require('mongoose');

const DeliveryChargeSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  charge: {
    type: Number,
    required: true,
    min: [0, 'Delivery charge cannot be negative'],
    default: 0
  },
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

// Update the updatedAt field before saving
DeliveryChargeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
DeliveryChargeSchema.index({ district: 1 });
DeliveryChargeSchema.index({ isActive: 1 });

// Default Sri Lankan districts
const sriLankanDistricts = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Moneragala',
  'Ratnapura',
  'Kegalle'
];

module.exports = {
  DeliveryCharge: mongoose.model('DeliveryCharge', DeliveryChargeSchema),
  sriLankanDistricts
};
