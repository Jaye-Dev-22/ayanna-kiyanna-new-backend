const User = require('../models/User');
const OTP = require('../models/OTP');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const config = require('config');
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
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

// Register new user (NO OTP verification required - direct registration)
exports.register = async (req, res) => {
  const { email, fullName, password } = req.body;

  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user with verified email (no OTP required)
    user = new User({
      email,
      fullName,
      password,
      role: 'user', // Default role
      emailVerified: true // Automatically verified
    });

    // Save user
    await user.save();

    console.log(`✅ New user registered: ${email} (auto-verified)`);

    // Send welcome email (optional - no OTP)
    try {
      await emailService.sendWelcomeEmail(email, fullName);
      console.log(`📧 Welcome email sent to: ${email}`);
    } catch (emailError) {
      // Don't fail registration if welcome email fails
      console.error('⚠️ Failed to send welcome email:', emailError.message);
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
    console.error('Registration error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
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
    console.log('getMe called with req.user:', req.user);
    const user = await User.findById(req.user.id).select('-password');
    console.log('Found user:', user ? 'User found' : 'User not found');
    res.json(user);
  } catch (err) {
    console.error('getMe error:', err.message);
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

// Send password reset OTP
exports.sendPasswordResetOTP = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'You are not in our User database. Please Sign Up first.'
      });
    }

    // Generate and save OTP for password reset
    const otpCode = await OTP.createOTP(email, 'password_reset');

    // Send user password reset OTP email
    const emailResult = await emailService.sendUserPasswordResetOTPEmail(email, otpCode, user.fullName);

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send password reset email' });
    }

    res.json({
      message: 'Password reset code sent to your email',
      email: email
    });
  } catch (err) {
    console.error('Error in sendPasswordResetOTP:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Verify password reset OTP
exports.verifyPasswordResetOTP = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, otp } = req.body;

  try {
    // Check OTP without marking as verified (for intermediate step)
    const verificationResult = await OTP.checkOTP(email, otp, 'password_reset');

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // Now mark it as verified for final use
    await OTP.verifyOTP(email, otp, 'password_reset');

    res.json({
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    });
  } catch (err) {
    console.error('Error in verifyPasswordResetOTP:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, otp, newPassword } = req.body;

  try {
    // Verify OTP for final use (should already be verified)
    const verificationResult = await OTP.verifyOTPForFinalUse(email, otp, 'password_reset');
    if (!verificationResult.success) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    // Clean up used OTP
    await OTP.deleteMany({ email, purpose: 'password_reset' });

    // Send user confirmation email
    await emailService.sendUserPasswordResetConfirmationEmail(email, user.fullName);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (err) {
    console.error('Error in resetUserPassword:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};