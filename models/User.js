const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'is invalid']
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'student', 'Teacher', 'moderator'],
    default: 'user'
  },
  studentPassword: {
    type: String,
    minlength: 6
  },
  emailVerified: {
    type: Boolean,
    default: true // Auto-verified - no OTP required
  },
  firebaseUid: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') && !this.isModified('studentPassword')) return next();

  try {
    const salt = await bcrypt.genSalt(10);

    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified('studentPassword') && this.studentPassword) {
      this.studentPassword = await bcrypt.hash(this.studentPassword, salt);
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to compare student passwords
UserSchema.methods.compareStudentPassword = async function(candidatePassword) {
  if (!this.studentPassword) return false;
  return await bcrypt.compare(candidatePassword, this.studentPassword);
};

module.exports = mongoose.model('User', UserSchema);