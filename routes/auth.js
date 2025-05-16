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
  firebaseGoogleAuth
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

router.get("/me", auth, getMe);
router.post("/firebase-google", firebaseGoogleAuth);

module.exports = router;