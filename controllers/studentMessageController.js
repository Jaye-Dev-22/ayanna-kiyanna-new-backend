const StudentMessage = require('../models/StudentMessage');
const User = require('../models/User');
const Student = require('../models/Student');
const { validationResult } = require('express-validator');

// Helper function to get user with contact information
const getUserWithContactInfo = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  // If user is a student, get contact numbers from Student schema
  if (user.role === 'user') {
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        contactNumber: student.contactNumber,
        whatsappNumber: student.whatsappNumber
      };
    }
  }

  // For non-students, return user info without contact numbers
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    contactNumber: 'N/A',
    whatsappNumber: 'N/A'
  };
};

// @desc    Submit new student message
// @route   POST /api/student-messages
// @access  Private
const submitMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { about, message, attachments } = req.body;

    // Validate attachments count
    if (attachments && attachments.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 attachments are allowed'
      });
    }

    // Create new student message
    const studentMessage = new StudentMessage({
      about,
      message,
      attachments: attachments || [],
      submittedBy: req.user.id
    });

    await studentMessage.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(req.user.id);

    const messageObj = studentMessage.toObject();
    messageObj.submittedBy = userWithContact;

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      data: messageObj
    });
  } catch (error) {
    console.error('Error submitting student message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting message'
    });
  }
};

// @desc    Get user's messages
// @route   GET /api/student-messages/my-messages
// @access  Private
const getMyMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const messages = await StudentMessage.find({ 
      submittedBy: req.user.id, 
      isActive: true 
    })
      .populate('repliedBy', 'fullName email')
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudentMessage.countDocuments({ 
      submittedBy: req.user.id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Get all student messages (Admin only)
// @route   GET /api/student-messages/all
// @access  Private (Admin/Moderator)
const getAllMessages = async (req, res) => {
  try {
    const { replied, page = 1, limit = 10 } = req.query;
    
    let filter = { isActive: true };
    
    // Filter by reply status if provided
    if (replied === 'true') {
      filter.reply = { $exists: true, $ne: null };
    } else if (replied === 'false') {
      filter.reply = { $exists: false };
    }

    const messages = await StudentMessage.find(filter)
      .populate('repliedBy', 'fullName email')
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get user information with contact details for each message
    const messagesWithUserInfo = await Promise.all(
      messages.map(async (message) => {
        const userWithContact = await getUserWithContactInfo(message.submittedBy);
        const messageObj = message.toObject();
        messageObj.submittedBy = userWithContact;
        return messageObj;
      })
    );

    const total = await StudentMessage.countDocuments(filter);

    res.json({
      success: true,
      data: messagesWithUserInfo,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all student messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Get unreplied messages count
// @route   GET /api/student-messages/unreplied-count
// @access  Private (Admin/Moderator)
const getUnrepliedCount = async (req, res) => {
  try {
    const count = await StudentMessage.countDocuments({
      isActive: true,
      reply: { $exists: false }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unreplied messages count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting count'
    });
  }
};

// @desc    Reply to student message
// @route   PUT /api/student-messages/:id/reply
// @access  Private (Admin/Moderator)
const replyToMessage = async (req, res) => {
  try {
    const { reply, replyAttachments } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply cannot be empty'
      });
    }

    const message = await StudentMessage.findById(req.params.id);
    if (!message || !message.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.reply) {
      return res.status(400).json({
        success: false,
        message: 'Message has already been replied to'
      });
    }

    message.reply = reply.trim();
    message.replyAttachments = replyAttachments || [];
    message.repliedBy = req.user.id;
    message.repliedAt = new Date();

    await message.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(message.submittedBy);
    await message.populate('repliedBy', 'fullName email');

    const messageObj = message.toObject();
    messageObj.submittedBy = userWithContact;

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: messageObj
    });
  } catch (error) {
    console.error('Error replying to student message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while replying to message'
    });
  }
};

// @desc    Edit reply to student message
// @route   PUT /api/student-messages/:id/edit-reply
// @access  Private (Admin/Moderator)
const editReply = async (req, res) => {
  try {
    const { reply, replyAttachments } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply cannot be empty'
      });
    }

    const message = await StudentMessage.findById(req.params.id);
    if (!message || !message.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (!message.reply) {
      return res.status(400).json({
        success: false,
        message: 'No reply exists to edit'
      });
    }

    // Check if the current user is the one who replied or is admin
    if (message.repliedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this reply'
      });
    }

    message.reply = reply.trim();
    message.replyAttachments = replyAttachments || [];
    message.repliedAt = new Date(); // Update reply timestamp

    await message.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(message.submittedBy);
    await message.populate('repliedBy', 'fullName email');

    const messageObj = message.toObject();
    messageObj.submittedBy = userWithContact;

    res.json({
      success: true,
      message: 'Reply updated successfully',
      data: messageObj
    });
  } catch (error) {
    console.error('Error editing reply to student message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while editing reply'
    });
  }
};

// @desc    Update student message
// @route   PUT /api/student-messages/:id
// @access  Private (Message Owner - only if not replied)
const updateMessage = async (req, res) => {
  try {
    const { about, message, attachments } = req.body;

    const studentMessage = await StudentMessage.findById(req.params.id);
    if (!studentMessage || !studentMessage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the message owner
    if (studentMessage.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message'
      });
    }

    // Check if message has been replied to
    if (studentMessage.reply) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit message that has been replied to'
      });
    }

    // Validate attachments count
    if (attachments && attachments.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 attachments are allowed'
      });
    }

    // Update message
    studentMessage.about = about;
    studentMessage.message = message;
    studentMessage.attachments = attachments || [];

    await studentMessage.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(req.user.id);

    const messageObj = studentMessage.toObject();
    messageObj.submittedBy = userWithContact;

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: messageObj
    });
  } catch (error) {
    console.error('Error updating student message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating message'
    });
  }
};

// @desc    Delete student message
// @route   DELETE /api/student-messages/:id
// @access  Private (Admin/Moderator or Message Owner)
const deleteMessage = async (req, res) => {
  try {
    const message = await StudentMessage.findById(req.params.id);
    if (!message || !message.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is admin or the message owner
    if (req.user.role !== 'admin' && req.user.role !== 'moderator' &&
        message.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    // Students can only delete if not replied, admins can delete anytime
    if (req.user.role !== 'admin' && req.user.role !== 'moderator' && message.reply) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete message that has been replied to'
      });
    }

    // Soft delete
    message.isActive = false;
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

module.exports = {
  submitMessage,
  getMyMessages,
  getAllMessages,
  getUnrepliedCount,
  replyToMessage,
  editReply,
  updateMessage,
  deleteMessage
};
