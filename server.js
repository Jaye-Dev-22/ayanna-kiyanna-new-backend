require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('config');

const app = express();

// Enhanced CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://ayanna-kiyanna-new-frontend.vercel.app',
  'https://ayanna-kiyanna-new-frintend.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Other middleware
app.use(express.json());

// DB Connection
mongoose.connect(process.env.MONGODB_URI || config.get('mongoURI'))
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic health check route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Routes - Make sure to import them correctly
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));