require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('config');

const app = express();

// Enhanced CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ayanna-kiyanna-new-frintend.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080'
];

const corsOptions = {
  origin: function (origin, callback) {
    // For development or when no origin is provided (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      callback(null, true); // Temporarily allow all origins for debugging
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Add a middleware to handle OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
    res.status(200).send();
    return;
  }
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection with improved error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || config.get('mongoURI'), {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Basic health check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Backend is running'
  });
});

// Routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const studentRoutes = require('./routes/students');
const adminStudentRoutes = require('./routes/adminStudents');
const notificationRoutes = require('./routes/notifications');
const classRequestRoutes = require('./routes/classRequests');
const attendanceRoutes = require('./routes/attendance');
const paymentRoutes = require('./routes/payments');
const adminPaymentRoutes = require('./routes/adminPayments');
const assignmentRoutes = require('./routes/assignments');
const examRoutes = require('./routes/exams');
const resourceRoutes = require('./routes/resources');
const announcementRoutes = require('./routes/announcements');
const timeScheduleRoutes = require('./routes/timeSchedules');
const onlineSessionRoutes = require('./routes/onlineSession');
const grammarRoutes = require('./routes/grammar');
const literatureRoutes = require('./routes/literature');
const gradeRoutes = require('./routes/grades');
const paperBankRoutes = require('./routes/paperBank');
const paperStructureRoutes = require('./routes/paperStructures');
const subjectGuidelinesRoutes = require('./routes/subjectGuidelines');
const teacherHandbookRoutes = require('./routes/teacherHandbook');
const videoLessonsRoutes = require('./routes/videoLessons');
const othersRoutes = require('./routes/others');
const academicInfoRoutes = require('./routes/academicInfo');
const extracurricularRoutes = require('./routes/extracurricular');
const photoBucketRoutes = require('./routes/photoBucket');
const specialNoticesRoutes = require('./routes/specialNotices');
const feedbackRoutes = require('./routes/feedback');
const studentNoticesRoutes = require('./routes/studentNotices');
const studentMessagesRoutes = require('./routes/studentMessages');

// E-commerce routes
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const deliveryChargeRoutes = require('./routes/deliveryCharges');

// Add specific CORS handling for auth routes
app.options('/api/auth/*', cors(corsOptions));
app.use('/api/auth', authRoutes);

// Add specific CORS handling for class routes
app.options('/api/classes/*', cors(corsOptions));
app.use('/api/classes', classRoutes);

// Add specific CORS handling for student routes
app.options('/api/students/*', cors(corsOptions));
app.use('/api/students', studentRoutes);

// Add specific CORS handling for admin student routes
app.options('/api/admin/students/*', cors(corsOptions));
app.use('/api/admin/students', adminStudentRoutes);

// Add specific CORS handling for notification routes
app.options('/api/notifications/*', cors(corsOptions));
app.use('/api/notifications', notificationRoutes);

// Add specific CORS handling for class request routes
app.options('/api/class-requests/*', cors(corsOptions));
app.use('/api/class-requests', classRequestRoutes);

// Add specific CORS handling for attendance routes
app.options('/api/attendance/*', cors(corsOptions));
app.use('/api/attendance', attendanceRoutes);

// Add specific CORS handling for payment routes
app.options('/api/payments/*', cors(corsOptions));
app.use('/api/payments', paymentRoutes);

// Add specific CORS handling for admin payment routes
app.options('/api/admin/*', cors(corsOptions));
app.use('/api/admin', adminPaymentRoutes);

// Add specific CORS handling for assignment routes
app.options('/api/assignments/*', cors(corsOptions));
app.use('/api/assignments', assignmentRoutes);

// Add specific CORS handling for exam routes
app.options('/api/exams/*', cors(corsOptions));
app.use('/api/exams', examRoutes);

// Add specific CORS handling for resource routes
app.options('/api/resources/*', cors(corsOptions));
app.use('/api/resources', resourceRoutes);

// Add specific CORS handling for announcement routes
app.options('/api/announcements/*', cors(corsOptions));
app.use('/api/announcements', announcementRoutes);

// Add specific CORS handling for time schedule routes
app.options('/api/time-schedules/*', cors(corsOptions));
app.use('/api/time-schedules', timeScheduleRoutes);

// Add specific CORS handling for online session routes
app.options('/api/online-sessions/*', cors(corsOptions));
app.use('/api/online-sessions', onlineSessionRoutes);

// Add specific CORS handling for grammar routes
app.options('/api/grammar/*', cors(corsOptions));
app.use('/api/grammar', grammarRoutes);

// Add specific CORS handling for literature routes
app.options('/api/literature/*', cors(corsOptions));
app.use('/api/literature', literatureRoutes);

// Add specific CORS handling for grade routes
app.options('/api/grades/*', cors(corsOptions));
app.use('/api/grades', gradeRoutes);

// Add specific CORS handling for paper bank routes
app.options('/api/paperbank/*', cors(corsOptions));
app.use('/api/paperbank', paperBankRoutes);

// Add specific CORS handling for paper structure routes
app.options('/api/paper-structures/*', cors(corsOptions));
app.use('/api/paper-structures', paperStructureRoutes);

// Add specific CORS handling for subject guidelines routes
app.options('/api/subject-guidelines/*', cors(corsOptions));
app.use('/api/subject-guidelines', subjectGuidelinesRoutes);

// Add specific CORS handling for teacher handbook routes
app.options('/api/teacher-handbook/*', cors(corsOptions));
app.use('/api/teacher-handbook', teacherHandbookRoutes);

// Add specific CORS handling for video lessons routes
app.options('/api/video-lessons/*', cors(corsOptions));
app.use('/api/video-lessons', videoLessonsRoutes);

// Add specific CORS handling for others routes
app.options('/api/others/*', cors(corsOptions));
app.use('/api/others', othersRoutes);

// Add specific CORS handling for academic info routes
app.options('/api/academic-info/*', cors(corsOptions));
app.use('/api/academic-info', academicInfoRoutes);

// Add specific CORS handling for extracurricular routes
app.options('/api/extracurricular/*', cors(corsOptions));
app.use('/api/extracurricular', extracurricularRoutes);

// Add specific CORS handling for photo bucket routes
app.options('/api/photo-bucket/*', cors(corsOptions));
app.use('/api/photo-bucket', photoBucketRoutes);

// Add specific CORS handling for special notices routes
app.options('/api/special-notices/*', cors(corsOptions));
app.use('/api/special-notices', specialNoticesRoutes);

// Add specific CORS handling for feedback routes
app.options('/api/feedback/*', cors(corsOptions));
app.use('/api/feedback', feedbackRoutes);

// Add specific CORS handling for student notices routes
app.options('/api/student-notices/*', cors(corsOptions));
app.use('/api/student-notices', studentNoticesRoutes);

// Add specific CORS handling for student messages routes
app.options('/api/student-messages/*', cors(corsOptions));
app.use('/api/student-messages', studentMessagesRoutes);

// Add specific CORS handling for e-commerce routes
app.options('/api/products/*', cors(corsOptions));
app.use('/api/products', productRoutes);

app.options('/api/cart/*', cors(corsOptions));
app.use('/api/cart', cartRoutes);

app.options('/api/orders/*', cors(corsOptions));
app.use('/api/orders', orderRoutes);

app.options('/api/delivery-charges/*', cors(corsOptions));
app.use('/api/delivery-charges', deliveryChargeRoutes);

// Add specific CORS handling for ratings routes
app.options('/api/ratings/*', cors(corsOptions));
app.use('/api/ratings', require('./routes/ratings'));

// Add specific CORS handling for analytics routes
app.options('/api/analytics/*', cors(corsOptions));
app.use('/api/analytics', require('./routes/analytics'));

// Add specific CORS handling for alphabet category routes
app.options('/api/swara/*', cors(corsOptions));
app.use('/api/swara', require('./routes/swara'));

app.options('/api/viyanjana/*', cors(corsOptions));
app.use('/api/viyanjana', require('./routes/viyanjana'));

app.options('/api/akaradiya/*', cors(corsOptions));
app.use('/api/akaradiya', require('./routes/akaradiya'));

app.options('/api/aksharavinyasaya/*', cors(corsOptions));
app.use('/api/aksharavinyasaya', require('./routes/aksharavinyasaya'));

// Add specific CORS handling for reviews routes
app.options('/api/reviews/*', cors(corsOptions));
app.use('/api/reviews', require('./routes/reviews'));

// Add specific CORS handling for appreciation routes
app.options('/api/appreciation/*', cors(corsOptions));
app.use('/api/appreciation', require('./routes/appreciation'));

// Add specific CORS handling for otherEnt routes
app.options('/api/otherEnt/*', cors(corsOptions));
app.use('/api/otherEnt', require('./routes/otherEnt'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server only after DB connection
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

    // Initialize scheduled cleanup tasks
    const { scheduleCleanupTasks } = require('./utils/scheduler');
    scheduleCleanupTasks();
  });
});