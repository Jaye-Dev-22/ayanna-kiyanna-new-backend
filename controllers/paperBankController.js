const { validationResult } = require('express-validator');
const PaperBank = require('../models/PaperBank');

// @desc    Get all papers with filtering and sorting
// @route   GET /api/paperbank
// @access  Private
const getAllPapers = async (req, res) => {
  try {
    const { grade, paperType, paperYear, paperPart } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (grade) filter.grade = grade;
    if (paperType) filter.paperType = paperType;
    if (paperYear) filter.paperYear = paperYear;
    if (paperPart) filter.paperPart = paperPart;

    // Get papers with sorting (old first, new last)
    const papers = await PaperBank.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }) // Ascending order (old first)
      .lean();

    res.json({
      success: true,
      data: papers
    });
  } catch (err) {
    console.error('Error fetching papers:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get paper by ID
// @route   GET /api/paperbank/:id
// @access  Private
const getPaperById = async (req, res) => {
  try {
    const paper = await PaperBank.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!paper || !paper.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    res.json({
      success: true,
      data: paper
    });
  } catch (err) {
    console.error('Error fetching paper:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new paper
// @route   POST /api/paperbank
// @access  Private (Admin/Moderator)
const createPaper = async (req, res) => {
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

    const {
      title,
      description,
      grade,
      paperType,
      paperYear,
      paperPart,
      attachments,
      sourceLinks
    } = req.body;

    // Create paper
    const paper = new PaperBank({
      title,
      description,
      grade,
      paperType,
      paperYear,
      paperPart,
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      createdBy: req.user.id
    });

    await paper.save();

    // Populate creator information
    await paper.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Paper created successfully',
      data: paper
    });
  } catch (err) {
    console.error('Error creating paper:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update paper
// @route   PUT /api/paperbank/:id
// @access  Private (Admin/Moderator)
const updatePaper = async (req, res) => {
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

    const {
      title,
      description,
      grade,
      paperType,
      paperYear,
      paperPart,
      attachments,
      sourceLinks
    } = req.body;

    const paper = await PaperBank.findById(req.params.id);
    if (!paper || !paper.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Update paper
    paper.title = title;
    paper.description = description;
    paper.grade = grade;
    paper.paperType = paperType;
    paper.paperYear = paperYear;
    paper.paperPart = paperPart;
    paper.attachments = attachments || [];
    paper.sourceLinks = sourceLinks || [];
    paper.updatedAt = Date.now();

    await paper.save();
    await paper.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Paper updated successfully',
      data: paper
    });
  } catch (err) {
    console.error('Error updating paper:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete paper (soft delete)
// @route   DELETE /api/paperbank/:id
// @access  Private (Admin/Moderator)
const deletePaper = async (req, res) => {
  try {
    const paper = await PaperBank.findById(req.params.id);
    if (!paper || !paper.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Soft delete
    paper.isActive = false;
    paper.updatedAt = Date.now();
    await paper.save();

    res.json({
      success: true,
      message: 'Paper deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting paper:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get filter options
// @route   GET /api/paperbank/filters
// @access  Private
const getFilterOptions = async (req, res) => {
  try {
    // Get unique values for filters
    const grades = await PaperBank.distinct('grade', { isActive: true });
    const paperTypes = await PaperBank.distinct('paperType', { isActive: true });
    const paperYears = await PaperBank.distinct('paperYear', { isActive: true });
    const paperParts = await PaperBank.distinct('paperPart', { isActive: true });

    res.json({
      success: true,
      data: {
        grades: grades.sort(),
        paperTypes: paperTypes.sort(),
        paperYears: paperYears.sort(),
        paperParts: paperParts.sort()
      }
    });
  } catch (err) {
    console.error('Error fetching filter options:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllPapers,
  getPaperById,
  createPaper,
  updatePaper,
  deletePaper,
  getFilterOptions
};
