const User = require('../models/User');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const config = require('config');
const { OAuth2Client } = require('google-auth-library');

// Initialize Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: config.get('firebase.projectId'),
  private_key_id: config.get('firebase.privateKeyId'),
  private_key: config.get('firebase.privateKey').replace(/\\n/g, '\n'),
  client_email: config.get('firebase.clientEmail'),
  client_id: config.get('firebase.clientId'),
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: config.get('firebase.clientX509CertUrl')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Register new user
exports.register = async (req, res) => {
  const { email, fullName, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      fullName,
      password,
      role: 'user' // Default role
    });

    // Save user
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Generate token
    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Generate token
    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });

    // Return token AND user data
    res.json({ 
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get logged-in user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Firebase Google Auth
exports.firebaseGoogleAuth = async (req, res) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, uid } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        fullName: name || email.split('@')[0],
        password: 'AyannaKiyannaDefault',
        role: 'user',
        firebaseUid: uid
      });
      
      await user.save();
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });

    res.json({ 
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};