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