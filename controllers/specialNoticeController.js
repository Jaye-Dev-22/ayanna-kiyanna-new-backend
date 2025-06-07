const SpecialNotice = require('../models/SpecialNotice');
const { validationResult } = require('express-validator');

// @desc    Create new special notice
// @route   POST /api/special-notices
// @access  Private (Admin/Moderator)
const createNotice = async (req, res) => {
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

    const { title, content, attachment, sourceLinks } = req.body;

    // Create new notice
    const notice = new SpecialNotice({
      title,
      content,
      attachment,
      sourceLinks: sourceLinks || [],
      createdBy: req.user.id
    });

    await notice.save();

    // Populate creator information
    await notice.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Special notice created successfully',
      data: notice
    });
  } catch (error) {
    console.error('Error creating special notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating special notice'
    });
  }
};

// @desc    Get all special notices
// @route   GET /api/special-notices
// @access  Private
const getAllNotices = async (req, res) => {
  try {
    const notices = await SpecialNotice.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('questions.askedBy', 'fullName email')
      .populate('questions.repliedBy', 'fullName email')
      .sort({ createdAt: -1 }); // Newest first for display

    res.json({
      success: true,
      data: notices
    });
  } catch (error) {
    console.error('Error fetching special notices:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching special notices'
    });
  }
};

// @desc    Get notice by ID
// @route   GET /api/special-notices/:id
// @access  Private
const getNoticeById = async (req, res) => {
  try {
    const notice = await SpecialNotice.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('questions.askedBy', 'fullName email')
      .populate('questions.repliedBy', 'fullName email');

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    res.json({
      success: true,
      data: notice
    });
  } catch (error) {
    console.error('Error fetching special notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching special notice'
    });
  }
};

// @desc    Update special notice
// @route   PUT /api/special-notices/:id
// @access  Private (Admin/Moderator)
const updateNotice = async (req, res) => {
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

    const { title, content, attachment, sourceLinks } = req.body;

    const notice = await SpecialNotice.findById(req.params.id);

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    // Update fields
    notice.title = title;
    notice.content = content;
    if (attachment) {
      notice.attachment = attachment;
    }
    notice.sourceLinks = sourceLinks || [];

    await notice.save();

    // Populate creator information
    await notice.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Special notice updated successfully',
      data: notice
    });
  } catch (error) {
    console.error('Error updating special notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating special notice'
    });
  }
};

// @desc    Delete special notice
// @route   DELETE /api/special-notices/:id
// @access  Private (Admin/Moderator)
const deleteNotice = async (req, res) => {
  try {
    const notice = await SpecialNotice.findById(req.params.id);

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    // Soft delete by setting isActive to false
    notice.isActive = false;
    await notice.save();

    res.json({
      success: true,
      message: 'Special notice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting special notice:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting special notice'
    });
  }
};

// @desc    Add question to notice
// @route   POST /api/special-notices/:id/questions
// @access  Private
const addQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const notice = await SpecialNotice.findById(req.params.id);

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    const newQuestion = {
      question: question.trim(),
      askedBy: req.user.id
    };

    notice.questions.push(newQuestion);
    await notice.save();

    // Get the newly added question with populated user data
    await notice.populate('questions.askedBy', 'fullName email');
    const addedQuestion = notice.questions[notice.questions.length - 1];

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: addedQuestion
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding question'
    });
  }
};

// @desc    Reply to question
// @route   PUT /api/special-notices/:noticeId/questions/:questionId/reply
// @access  Private (Admin/Moderator)
const replyToQuestion = async (req, res) => {
  try {
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply is required'
      });
    }

    const notice = await SpecialNotice.findById(req.params.noticeId);

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    const question = notice.questions.id(req.params.questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    question.reply = reply.trim();
    question.repliedBy = req.user.id;
    question.repliedAt = new Date();

    await notice.save();

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: question
    });
  } catch (error) {
    console.error('Error replying to question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while replying to question'
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/special-notices/:noticeId/questions/:questionId
// @access  Private (User can delete own questions if not replied, Admin can delete any)
const deleteQuestion = async (req, res) => {
  try {
    const notice = await SpecialNotice.findById(req.params.noticeId);

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Special notice not found'
      });
    }

    const question = notice.questions.id(req.params.questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    const isQuestionOwner = question.askedBy.toString() === req.user.id;
    const hasReply = question.reply;

    if (!isAdmin && (!isQuestionOwner || hasReply)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question'
      });
    }

    notice.questions.pull(req.params.questionId);
    await notice.save();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting question'
    });
  }
};

// @desc    Get unanswered questions count
// @route   GET /api/special-notices/unanswered-count
// @access  Private (Admin/Moderator)
const getUnansweredQuestionsCount = async (req, res) => {
  try {
    const notices = await SpecialNotice.find({ isActive: true });
    
    let unansweredCount = 0;
    notices.forEach(notice => {
      notice.questions.forEach(question => {
        if (!question.reply) {
          unansweredCount++;
        }
      });
    });

    res.json({
      success: true,
      data: { count: unansweredCount }
    });
  } catch (error) {
    console.error('Error getting unanswered questions count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unanswered questions count'
    });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  addQuestion,
  replyToQuestion,
  deleteQuestion,
  getUnansweredQuestionsCount
};
