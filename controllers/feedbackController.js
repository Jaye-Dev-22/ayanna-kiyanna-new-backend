const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Student = require('../models/Student');
const { validationResult } = require('express-validator');

// Helper function to get user details with contact info
const getUserWithContactInfo = async (userId) => {
  const user = await User.findById(userId).select('fullName email role');
  if (!user) return null;

  // If user is a student, get contact info from Student schema
  if (user.role === 'student') {
    const student = await Student.findOne({ userId: userId }).select('contactNumber whatsappNumber');
    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      contactNumber: student?.contactNumber || 'N/A',
      whatsappNumber: student?.whatsappNumber || 'N/A'
    };
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

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Private
const submitFeedback = async (req, res) => {
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

    const { about, title, description, attachment, sourceLinks } = req.body;

    // Create new feedback
    const feedback = new Feedback({
      about,
      title,
      description,
      attachment,
      sourceLinks: sourceLinks || [],
      submittedBy: req.user.id
    });

    await feedback.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(req.user.id);
    const feedbackWithUser = feedback.toObject();
    feedbackWithUser.submittedBy = userWithContact;

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedbackWithUser
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback'
    });
  }
};

// @desc    Get user's own feedbacks
// @route   GET /api/feedback/my-feedbacks
// @access  Private
const getMyFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      submittedBy: req.user.id,
      isActive: true
    })
      .populate('repliedBy', 'fullName email')
      .sort({ createdAt: -1 }); // Newest first

    // Get user information with contact details for each feedback
    const feedbacksWithUserInfo = await Promise.all(
      feedbacks.map(async (feedback) => {
        const userWithContact = await getUserWithContactInfo(feedback.submittedBy);
        const feedbackObj = feedback.toObject();
        feedbackObj.submittedBy = userWithContact;
        return feedbackObj;
      })
    );

    res.json({
      success: true,
      data: feedbacksWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching user feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedbacks'
    });
  }
};

// @desc    Get all feedbacks (Admin only)
// @route   GET /api/feedback/all
// @access  Private (Admin/Moderator)
const getAllFeedbacks = async (req, res) => {
  try {
    const { about, replied } = req.query;
    
    let filter = { isActive: true };
    
    // Filter by category if provided
    if (about && about !== 'all') {
      filter.about = about;
    }
    
    // Filter by reply status if provided
    if (replied === 'true') {
      filter.reply = { $exists: true, $ne: null };
    } else if (replied === 'false') {
      filter.reply = { $exists: false };
    }

    const feedbacks = await Feedback.find(filter)
      .populate('repliedBy', 'fullName email')
      .sort({ createdAt: -1 }); // Newest first

    // Get user information with contact details for each feedback
    const feedbacksWithUserInfo = await Promise.all(
      feedbacks.map(async (feedback) => {
        const userWithContact = await getUserWithContactInfo(feedback.submittedBy);
        const feedbackObj = feedback.toObject();
        feedbackObj.submittedBy = userWithContact;
        return feedbackObj;
      })
    );

    res.json({
      success: true,
      data: feedbacksWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching all feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedbacks'
    });
  }
};

// @desc    Get feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('repliedBy', 'fullName email');

    if (!feedback || !feedback.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user can access this feedback
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    const isOwner = feedback.submittedBy.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this feedback'
      });
    }

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(feedback.submittedBy);
    const feedbackObj = feedback.toObject();
    feedbackObj.submittedBy = userWithContact;

    res.json({
      success: true,
      data: feedbackObj
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback'
    });
  }
};

// @desc    Update feedback (User can update only if not replied)
// @route   PUT /api/feedback/:id
// @access  Private
const updateFeedback = async (req, res) => {
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

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback || !feedback.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user can update this feedback
    const isOwner = feedback.submittedBy.toString() === req.user.id;
    const hasReply = feedback.reply;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    if (hasReply) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update feedback that has been replied to'
      });
    }

    const { about, title, description, attachment, sourceLinks } = req.body;

    // Update fields
    feedback.about = about;
    feedback.title = title;
    feedback.description = description;
    if (attachment) {
      feedback.attachment = attachment;
    }
    feedback.sourceLinks = sourceLinks || [];

    await feedback.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(feedback.submittedBy);
    const feedbackObj = feedback.toObject();
    feedbackObj.submittedBy = userWithContact;

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedbackObj
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating feedback'
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private (User can delete own if not replied, Admin can delete any)
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback || !feedback.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    const isOwner = feedback.submittedBy.toString() === req.user.id;
    const hasReply = feedback.reply;

    if (!isAdmin && (!isOwner || hasReply)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }

    // Soft delete by setting isActive to false
    feedback.isActive = false;
    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting feedback'
    });
  }
};

// @desc    Reply to feedback (Admin only)
// @route   PUT /api/feedback/:id/reply
// @access  Private (Admin/Moderator)
const replyToFeedback = async (req, res) => {
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

    const { reply, replyAttachment, replySourceLinks } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply is required'
      });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback || !feedback.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.reply = reply.trim();
    feedback.repliedBy = req.user.id;
    feedback.repliedAt = new Date();

    if (replyAttachment) {
      feedback.replyAttachment = replyAttachment;
    }
    feedback.replySourceLinks = replySourceLinks || [];

    await feedback.save();

    // Get user information with contact details
    const userWithContact = await getUserWithContactInfo(feedback.submittedBy);
    await feedback.populate('repliedBy', 'fullName email');

    const feedbackObj = feedback.toObject();
    feedbackObj.submittedBy = userWithContact;

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: feedbackObj
    });
  } catch (error) {
    console.error('Error replying to feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while replying to feedback'
    });
  }
};

// @desc    Get unreplied feedbacks count (Admin only)
// @route   GET /api/feedback/unreplied-count
// @access  Private (Admin/Moderator)
const getUnrepliedFeedbacksCount = async (req, res) => {
  try {
    const count = await Feedback.countDocuments({
      isActive: true,
      reply: { $exists: false }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unreplied feedbacks count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unreplied feedbacks count'
    });
  }
};

module.exports = {
  submitFeedback,
  getMyFeedbacks,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  replyToFeedback,
  getUnrepliedFeedbacksCount
};
