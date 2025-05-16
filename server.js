require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('config');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'https://ayanna-kiyanna-new-frintend-v66f.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// DB Connection - Modern version (Mongoose 6+)
mongoose.connect(process.env.MONGODB_URI || config.get('mongoURI'))
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));