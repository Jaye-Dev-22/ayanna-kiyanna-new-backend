const User = require('../models/User');
const OTP = require('../models/OTP');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const config = require('config');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('../services/emailService');

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

// Send OTP for email verification
exports.sendEmailOTP = async (req, res) => {
  const { email, fullName } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ message: 'Email is already registered and verified' });
    }

    // Generate and save OTP
    const otpCode = await OTP.createOTP(email, 'email_verification');

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(email, otpCode, fullName);

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({
      message: 'Verification code sent to your email',
      email: email
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Verify email OTP
exports.verifyEmailOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'email_verification');

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    res.json({
      message: 'Email verified successfully',
      verified: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Register new user (requires email verification)
exports.register = async (req, res) => {
  const { email, fullName, password, emailVerified } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if email was verified (for regular registration)
    if (!emailVerified) {
      return res.status(400).json({ message: 'Email verification required before registration' });
    }

    // Verify that OTP was actually verified for this email
    const verifiedOTP = await OTP.findOne({
      email,
      purpose: 'email_verification',
      verified: true
    });

    if (!verifiedOTP) {
      return res.status(400).json({ message: 'Email verification not found. Please verify your email first.' });
    }

    // Create new user with verified email
    user = new User({
      email,
      fullName,
      password,
      role: 'user', // Default role
      emailVerified: true
    });

    // Save user
    await user.save();

    // Clean up verified OTP
    await OTP.deleteMany({ email, purpose: 'email_verification' });

    // Send welcome email
    await emailService.sendWelcomeEmail(email, fullName);

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Generate token
    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
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
    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '24h' });

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
        firebaseUid: uid,
        emailVerified: true
      });

      await user.save();
      await emailService.sendWelcomeEmail(email, name || email.split('@')[0]);
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '24h' });

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