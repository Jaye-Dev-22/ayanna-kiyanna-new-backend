const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'student_registration_approved',
      'student_registration_rejected',
      'class_enrollment',
      'class_request_approved',
      'class_request_rejected',
      'class_request_status_change',
      'admin_message',
      'general',
      'account_deletion',
      'status_change',
      'monitor_added',
      'monitor_removed',
      'class_fee_change'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    // Additional data related to the notification
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    classRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassRequest'
    },
    adminNote: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      trim: true
    },
    oldFee: {
      type: Number
    },
    newFee: {
      type: Number
    },
    isFreeClass: {
      type: Boolean
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function () {
      // Notifications expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
});

// Index for better query performance
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
NotificationSchema.statics.createNotification = async function (notificationData) {
  try {
    // Validate required fields
    if (!notificationData.recipient) {
      console.error('Notification creation failed: Missing recipient');
      throw new Error('Recipient is required for notification');
    }

    if (!notificationData.title || !notificationData.message) {
      console.error('Notification creation failed: Missing title or message');
      throw new Error('Title and message are required for notification');
    }

    // Ensure recipient is a valid ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(notificationData.recipient)) {
      console.error('Notification creation failed: Invalid recipient ID', notificationData.recipient);
      throw new Error('Invalid recipient ID');
    }

    const notification = new this(notificationData);
    await notification.save();
    console.log('Notification created successfully for recipient:', notificationData.recipient);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    console.error('Notification data:', notificationData);
    throw new Error(`Error creating notification: ${error.message}`);
  }
};

// Static method to mark as read
NotificationSchema.statics.markAsRead = async function (notificationId, userId) {
  try {
    const readAt = new Date();
    const expiresAt = new Date(readAt.getTime() + 24 * 60 * 60 * 1000); // 1 day from read time

    const notification = await this.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt, expiresAt },
      { new: true }
    );
    return notification;
  } catch (error) {
    throw new Error('Error marking notification as read');
  }
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function (userId) {
  try {
    const count = await this.countDocuments({
      recipient: userId,
      read: false
    });
    return count;
  } catch (error) {
    throw new Error('Error getting unread count');
  }
};

// Index for better query performance
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', NotificationSchema);

// Auto-delete expired notifications
setInterval(async () => {
  try {
    const now = new Date();
    await Notification.deleteMany({
      read: true,
      expiresAt: { $lte: now }
    });
  } catch (error) {
    console.error('Error auto-deleting expired notifications:', error);
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = Notification;
