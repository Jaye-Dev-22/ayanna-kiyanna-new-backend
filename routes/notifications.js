const express = require('express');
const router = express.Router();

// Import middlewares
const auth = require('../middleware/auth');

// Import controllers
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, getUserNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, getUnreadCount);

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', auth, markNotificationAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, markAllAsRead);

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete notification
// @access  Private
router.delete('/:notificationId', auth, deleteNotification);

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Private
router.delete('/', auth, deleteAllNotifications);

module.exports = router;
