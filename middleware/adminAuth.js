const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    
    // Get user from database to check current role
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Check if user has admin or moderator role
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ 
        message: 'Access denied. Admin or moderator role required.' 
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      fullName: user.fullName
    };
    
    next();
  } catch (err) {
    console.error('Admin auth middleware error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
