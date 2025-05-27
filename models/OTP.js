const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'is invalid']
  },
  otp: {
    type: String,
    required: true,
    length: 6
  },
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes (600 seconds)
  }
});

// Index for automatic cleanup
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

// Method to check if OTP is expired
OTPSchema.methods.isExpired = function() {
  const now = new Date();
  const expiryTime = new Date(this.createdAt.getTime() + 10 * 60 * 1000); // 10 minutes
  return now > expiryTime;
};

// Method to increment attempts
OTPSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

// Static method to generate 6-digit OTP
OTPSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create new OTP
OTPSchema.statics.createOTP = async function(email, purpose) {
  // Remove any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose });
  
  // Generate new OTP
  const otpCode = this.generateOTP();
  
  // Create new OTP record
  const otp = new this({
    email,
    otp: otpCode,
    purpose
  });
  
  await otp.save();
  return otpCode;
};

// Static method to verify OTP
OTPSchema.statics.verifyOTP = async function(email, otpCode, purpose) {
  const otpRecord = await this.findOne({ 
    email, 
    otp: otpCode, 
    purpose,
    verified: false 
  });
  
  if (!otpRecord) {
    return { success: false, message: 'Invalid or expired OTP' };
  }
  
  if (otpRecord.isExpired()) {
    await otpRecord.deleteOne();
    return { success: false, message: 'OTP has expired' };
  }
  
  if (otpRecord.attempts >= 5) {
    await otpRecord.deleteOne();
    return { success: false, message: 'Too many attempts. Please request a new OTP' };
  }
  
  // Mark as verified
  otpRecord.verified = true;
  await otpRecord.save();
  
  return { success: true, message: 'OTP verified successfully' };
};

module.exports = mongoose.model('OTP', OTPSchema);
