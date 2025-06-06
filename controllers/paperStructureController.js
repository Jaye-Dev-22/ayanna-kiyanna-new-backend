const PaperStructure = require('../models/PaperStructure');
const { validationResult } = require('express-validator');

// @desc    Get all paper structures with filtering and sorting
// @route   GET /api/paper-structures
// @access  Private
const getAllPaperStructures = async (req, res) => {
  try {
    const { type, grade, paperPart } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (type) filter.type = type;
    if (grade) filter.grade = grade;
    if (paperPart) filter.paperPart = paperPart;

    // Get paper structures with sorting (old first, new last)
    const paperStructures = await PaperStructure.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 }) // Ascending order (old first)
      .lean();

    res.json({
      success: true,
      data: paperStructures
    });
  } catch (err) {
    console.error('Error fetching paper structures:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get filter options for paper structures
// @route   GET /api/paper-structures/filters
// @access  Private
const getFilterOptions = async (req, res) => {
  try {
    // Get unique values for filters
    const types = await PaperStructure.distinct('type', { isActive: true });
    const grades = await PaperStructure.distinct('grade', { isActive: true });
    const paperParts = await PaperStructure.distinct('paperPart', { isActive: true });

    res.json({
      success: true,
      data: {
        types: types.sort(),
        grades: grades.sort(),
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

// @desc    Get paper structure by ID
// @route   GET /api/paper-structures/:id
// @access  Private
const getPaperStructureById = async (req, res) => {
  try {
    const paperStructure = await PaperStructure.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .lean();

    if (!paperStructure || !paperStructure.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper structure not found'
      });
    }

    res.json({
      success: true,
      data: paperStructure
    });
  } catch (err) {
    console.error('Error fetching paper structure:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new paper structure
// @route   POST /api/paper-structures
// @access  Private (Admin/Moderator)
const createPaperStructure = async (req, res) => {
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
      type,
      grade,
      paperPart,
      attachments,
      sourceLinks,
      additionalNote
    } = req.body;

    // Create paper structure
    const paperStructure = new PaperStructure({
      title,
      description,
      type,
      grade,
      paperPart,
      attachments: attachments || [],
      sourceLinks: sourceLinks || [],
      additionalNote,
      createdBy: req.user.id
    });

    await paperStructure.save();
    await paperStructure.populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Paper structure created successfully',
      data: paperStructure
    });
  } catch (err) {
    console.error('Error creating paper structure:', err.message);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update paper structure
// @route   PUT /api/paper-structures/:id
// @access  Private (Admin/Moderator)
const updatePaperStructure = async (req, res) => {
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
      type,
      grade,
      paperPart,
      attachments,
      sourceLinks,
      additionalNote
    } = req.body;

    const paperStructure = await PaperStructure.findById(req.params.id);
    if (!paperStructure || !paperStructure.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper structure not found'
      });
    }

    // Update paper structure
    paperStructure.title = title;
    paperStructure.description = description;
    paperStructure.type = type;
    paperStructure.grade = grade;
    paperStructure.paperPart = paperPart;
    paperStructure.attachments = attachments || [];
    paperStructure.sourceLinks = sourceLinks || [];
    paperStructure.additionalNote = additionalNote;
    paperStructure.updatedAt = Date.now();

    await paperStructure.save();
    await paperStructure.populate('createdBy', 'fullName email');

    res.json({
      success: true,
      message: 'Paper structure updated successfully',
      data: paperStructure
    });
  } catch (err) {
    console.error('Error updating paper structure:', err.message);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete paper structure (soft delete)
// @route   DELETE /api/paper-structures/:id
// @access  Private (Admin/Moderator)
const deletePaperStructure = async (req, res) => {
  try {
    const paperStructure = await PaperStructure.findById(req.params.id);
    if (!paperStructure || !paperStructure.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paper structure not found'
      });
    }

    // Soft delete
    paperStructure.isActive = false;
    paperStructure.updatedAt = Date.now();
    await paperStructure.save();

    res.json({
      success: true,
      message: 'Paper structure deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting paper structure:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllPaperStructures,
  getFilterOptions,
  getPaperStructureById,
  createPaperStructure,
  updatePaperStructure,
  deletePaperStructure
};
