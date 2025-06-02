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
  enrolledClasses: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    default: [],
    validate: {
      validator: function (classes) {
        // Check for duplicates
        const classIds = classes.map(id => id.toString());
        const uniqueIds = [...new Set(classIds)];
        return classIds.length === uniqueIds.length;
      },
      message: 'this Student already enrolled in this class'
    }
  },

  // Payment Information
  paymentRole: {
    type: String,
    enum: ['Pay Card', 'Free Card'],
    default: 'Pay Card'
  },
  freeClasses: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    default: [],
    validate: {
      validator: function (classes) {
        // Check for duplicates
        const classIds = classes.map(id => id.toString());
        const uniqueIds = [...new Set(classIds)];
        return classIds.length === uniqueIds.length;
      },
      message: 'Duplicate free classes not allowed'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['admissioned', 'Paid', 'Unpaid'],
    default: 'admissioned'
  },

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
StudentSchema.pre('save', async function (next) {
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
StudentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare student passwords
StudentSchema.methods.compareStudentPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.studentPassword);
};

// Static method to generate student ID
StudentSchema.statics.generateStudentId = async function (grade) {
  try {
    // Extract grade prefix based on new logic
    let gradePrefix = '';

    // Check if grade contains numbers
    const numbers = grade.match(/\d/g);
    if (numbers && numbers.length >= 2) {
      // Use first 2 numbers if available
      gradePrefix = numbers.slice(0, 2).join('');
    } else if (numbers && numbers.length === 1) {
      // If only one number, use it and first letter
      const letters = grade.match(/[A-Za-z]/g);
      if (letters && letters.length > 0) {
        gradePrefix = numbers[0] + letters[0].toUpperCase();
      } else {
        gradePrefix = numbers[0] + '0'; // fallback
      }
    } else {
      // No numbers found, use first 2 letters
      const letters = grade.match(/[A-Za-z]/g);
      if (letters && letters.length >= 2) {
        gradePrefix = letters.slice(0, 2).join('').toUpperCase();
      } else if (letters && letters.length === 1) {
        gradePrefix = letters[0].toUpperCase() + 'X'; // fallback
      } else {
        gradePrefix = 'XX'; // fallback for edge cases
      }
    }

    // Get current year's last 2 digits
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);

    // Find the highest existing student ID for this grade and year
    const searchPattern = `^AKG${gradePrefix}\\d{4}Y${yearSuffix}$`;
    const lastStudent = await this.findOne({
      studentId: { $regex: searchPattern }
    }).sort({ studentId: -1 });

    let nextNumber = 1;
    if (lastStudent) {
      // Extract the 4-digit number from the student ID
      // Format: AKG + gradePrefix + 0001 + Y + yearSuffix
      const idParts = lastStudent.studentId;
      const numberPart = idParts.substring(3 + gradePrefix.length, 3 + gradePrefix.length + 4);
      nextNumber = parseInt(numberPart) + 1;
    }

    // Format as 4-digit number
    const formattedNumber = nextNumber.toString().padStart(4, '0');

    // Final format: AKG + gradePrefix + 0001 + Y + yearSuffix
    return `AKG${gradePrefix}${formattedNumber}Y${yearSuffix}`;
  } catch (error) {
    console.error('Error generating student ID:', error);
    throw new Error('Error generating student ID');
  }
};

// Virtual for full name
StudentSchema.virtual('fullName').get(function () {
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
