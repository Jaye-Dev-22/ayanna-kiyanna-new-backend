require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());

app.use(cors({
    origin: ["http://localhost:5173", "http://ayannakiynna.com", "https://ayanna-kiyanna-new-frintend-v66f.vercel.app"]
  }));
  
  app.options('*', cors());

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ayanna Kiyann Sinhala Institute API' });
});

// Add your routes here
// Example: 
// const studentRoutes = require('./routes/students');
// app.use('/api/students', studentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});