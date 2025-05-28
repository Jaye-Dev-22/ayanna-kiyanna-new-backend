const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
  // Personal Information
  surname: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'is invalid']
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  school: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  birthday: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  currentStudent: {
    type: String,
    enum: ['Current Student', 'New Student'],
    required: true
  },
  profilePicture: {
    type: String, // Cloudinary URL
    trim: true
  },
  
  // Guardian Information
  guardianName: {
    type: String,
    required: true,
    trim: true
  },
  guardianType: {
    type: String,
    enum: ['Mother', 'Father', 'Guardian', 'Other'],
    required: true
  },
  guardianContact: {
    type: String,
    required: true,
    trim: true
  },
  
  // Academic Information
  selectedGrade: {
    type: String,
    required: true,
    trim: true
  },
  enrolledClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  
  // Student Credentials
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  studentPassword: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Registration Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Terms Agreement
  agreedToTerms: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Admin Action
  adminAction: {
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionDate: {
      type: Date
    },
    actionNote: {
      type: String,
      trim: true
    }
  }
});

// Hash student password before saving
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('studentPassword')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.studentPassword = await bcrypt.hash(this.studentPassword, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Update the updatedAt field before saving
StudentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare student passwords
StudentSchema.methods.compareStudentPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.studentPassword);
};

// Static method to generate student ID
StudentSchema.statics.generateStudentId = async function(grade) {
  try {
    // Get first 2 characters of grade
    const gradePrefix = grade.substring(0, 2).toUpperCase();
    
    // Find the highest existing student ID for this grade
    const lastStudent = await this.findOne({
      studentId: { $regex: `^AKG${gradePrefix}` }
    }).sort({ studentId: -1 });
    
    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentId.substring(5)); // Remove 'AKG' + 2 grade chars
      nextNumber = lastNumber + 1;
    }
    
    // Format as 4-digit number
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `AKG${gradePrefix}${formattedNumber}`;
  } catch (error) {
    throw new Error('Error generating student ID');
  }
};

// Virtual for full name
StudentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON output
StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

// Index for better query performance
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ userId: 1 });
StudentSchema.index({ status: 1 });
StudentSchema.index({ selectedGrade: 1 });

module.exports = mongoose.model('Student', StudentSchema);
