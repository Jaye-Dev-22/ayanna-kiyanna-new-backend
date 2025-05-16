require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/proxy/get_key', async (req, res) => {
  try {
    const response = await axios.get('https://extensions.aitopia.ai/extensions/app/get_key');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

// DB Connection - Modern version (Mongoose 6+)
mongoose.connect(process.env.MONGODB_URI || config.get('mongoURI'))
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));