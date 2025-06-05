const express = require('express');
const router = express.Router();
const {
  createOnlineSession,
  getOnlineSessionsByClass,
  getOnlineSession,
  updateOnlineSession,
  deleteOnlineSession
} = require('../controllers/onlineSessionController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   POST /api/online-sessions
// @desc    Create a new online session
// @access  Private (Admin/Moderator only)
router.post('/', adminAuth, createOnlineSession);

// @route   GET /api/online-sessions/class/:classId
// @desc    Get all online sessions for a class
// @access  Private
router.get('/class/:classId', auth, getOnlineSessionsByClass);

// @route   GET /api/online-sessions/:id
// @desc    Get a single online session
// @access  Private
router.get('/:id', auth, getOnlineSession);

// @route   PUT /api/online-sessions/:id
// @desc    Update an online session
// @access  Private (Admin/Moderator only)
router.put('/:id', adminAuth, updateOnlineSession);

// @route   DELETE /api/online-sessions/:id
// @desc    Delete an online session
// @access  Private (Admin/Moderator only)
router.delete('/:id', adminAuth, deleteOnlineSession);

module.exports = router;
