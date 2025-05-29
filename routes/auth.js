const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

// import middlewares
const auth = require("../middleware/auth");

// import controllers
const {
  register,
  login,
  getMe,
  firebaseGoogleAuth,
  sendEmailOTP,
  verifyEmailOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetUserPassword
} = require("../controllers/authController");

// Auth routes
router.post(
  "/register",
  [
    check("email", "Please include a valid email").isEmail(),
    check("fullName", "Name is required").not().isEmpty(),
    check("password", "Please enter a password with 6+ characters").isLength({ min: 6 })
  ],
  register
);

router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists()
  ],
  login
);

// Email verification routes
router.post(
  "/send-email-otp",
  [
    check("email", "Please include a valid email").isEmail(),
    check("fullName", "Name is required").not().isEmpty()
  ],
  sendEmailOTP
);

router.post(
  "/verify-email-otp",
  [
    check("email", "Please include a valid email").isEmail(),
    check("otp", "OTP is required").isLength({ min: 6, max: 6 })
  ],
  verifyEmailOTP
);

router.get("/me", auth, getMe);
router.post("/firebase-google", firebaseGoogleAuth);

// Password Reset Routes (Public - no auth required)
// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP to email
// @access  Public
router.post(
  "/forgot-password",
  [
    check("email", "Please include a valid email").isEmail()
  ],
  sendPasswordResetOTP
);

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify password reset OTP
// @access  Public
router.post(
  "/verify-reset-otp",
  [
    check("email", "Please include a valid email").isEmail(),
    check("otp", "OTP is required").isLength({ min: 6, max: 6 })
  ],
  verifyPasswordResetOTP
);

// @route   POST /api/auth/reset-password
// @desc    Reset user password with verified OTP
// @access  Public
router.post(
  "/reset-password",
  [
    check("email", "Please include a valid email").isEmail(),
    check("otp", "OTP is required").isLength({ min: 6, max: 6 }),
    check("newPassword", "Please enter a password with 6+ characters").isLength({ min: 6 })
  ],
  resetUserPassword
);

module.exports = router;