const { validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Class = require('../models/Class');
const Student = require('../models/Student');

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Admin/Moderator)
const createAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      tasks,
      attachments,
      guidelines,
      classId,
      dueDate
    } = req.body;

    // Verify class exists and user has access
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Create assignment
    const assignment = new Assignment({
      title,
      description,
      tasks: tasks || [],
      attachments: attachments || [],
      guidelines: guidelines || [],
      classId,
      createdBy: req.user.id,
      dueDate: dueDate || null
    });

    await assignment.save();

    // Populate creator information
    await assignment.populate('createdBy', 'fullName email');
    await assignment.populate('classId', 'title grade');

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });

  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all assignments for a class
// @route   GET /api/assignments/class/:classId
// @access  Private (Admin/Moderator/Student)
const getClassAssignments = async (req, res) => {
  try {
    const { classId } = req.params;
    const { published } = req.query;

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Build query
    let query = { classId };
    
    // For students, only show published assignments
    // For admin/moderator, show all or filter by published status
    if (req.user.role === 'student' || published === 'true') {
      query.isPublished = true;
    } else if (published === 'false') {
      query.isPublished = false;
    }

    const assignments = await Assignment.find(query)
      .populate('createdBy', 'fullName email')
      .populate('classId', 'title grade')
      .sort({ createdAt: -1 });

    // For students, also get their submission status
    if (req.user.role === 'student') {
      const studentData = await Student.findOne({ userId: req.user.id });
      if (studentData) {
        const assignmentIds = assignments.map(a => a._id);
        const submissions = await AssignmentSubmission.find({
          assignmentId: { $in: assignmentIds },
          studentId: studentData._id
        });

        // Add submission status to each assignment
        const assignmentsWithStatus = assignments.map(assignment => {
          const submission = submissions.find(s => 
            s.assignmentId.toString() === assignment._id.toString()
          );
          
          return {
            ...assignment.toObject(),
            submissionStatus: submission ? {
              submitted: true,
              submittedAt: submission.submittedAt,
              marks: submission.marks,
              feedback: submission.feedback,
              status: submission.status
            } : {
              submitted: false
            }
          };
        });

        return res.json({ assignments: assignmentsWithStatus });
      }
    }

    res.json({ assignments });

  } catch (error) {
    console.error('Get class assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private (Admin/Moderator/Student)
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate('createdBy', 'fullName email')
      .populate('classId', 'title grade');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // For students, only show published assignments
    if (req.user.role === 'student' && !assignment.isPublished) {
      return res.status(403).json({ message: 'Assignment not available' });
    }

    // For students, also get their submission if exists
    if (req.user.role === 'student') {
      const studentData = await Student.findOne({ userId: req.user.id });
      if (studentData) {
        const submission = await AssignmentSubmission.findOne({
          assignmentId: id,
          studentId: studentData._id
        });

        const assignmentWithStatus = {
          ...assignment.toObject(),
          submissionStatus: submission ? {
            submitted: true,
            submittedAt: submission.submittedAt,
            submissionText: submission.submissionText,
            attachments: submission.attachments,
            marks: submission.marks,
            feedback: submission.feedback,
            status: submission.status
          } : {
            submitted: false
          }
        };

        return res.json({ assignment: assignmentWithStatus });
      }
    }

    res.json({ assignment });

  } catch (error) {
    console.error('Get assignment by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Admin/Moderator)
const updateAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update assignment
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        assignment[key] = updateData[key];
      }
    });

    await assignment.save();

    // Populate and return updated assignment
    await assignment.populate('createdBy', 'fullName email');
    await assignment.populate('classId', 'title grade');

    res.json({
      message: 'Assignment updated successfully',
      assignment
    });

  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Admin/Moderator)
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Delete all submissions for this assignment
    await AssignmentSubmission.deleteMany({ assignmentId: id });

    // Delete the assignment
    await Assignment.findByIdAndDelete(id);

    res.json({ message: 'Assignment and all submissions deleted successfully' });

  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Publish/Unpublish assignment
// @route   PUT /api/assignments/:id/publish
// @access  Private (Admin/Moderator)
const togglePublishAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    assignment.isPublished = isPublished;
    if (isPublished && !assignment.publishedAt) {
      assignment.publishedAt = Date.now();
    }

    await assignment.save();

    res.json({
      message: `Assignment ${isPublished ? 'published' : 'unpublished'} successfully`,
      assignment
    });

  } catch (error) {
    console.error('Toggle publish assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
const submitAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { submissionText, attachments } = req.body;

    // Verify assignment exists and is published
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (!assignment.isPublished) {
      return res.status(403).json({ message: 'Assignment is not published yet' });
    }

    // Get student data
    const studentData = await Student.findOne({ userId: req.user.id });
    if (!studentData) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if student is enrolled in the class
    const classData = await Class.findById(assignment.classId);
    if (!classData.enrolledStudents.includes(studentData._id)) {
      return res.status(403).json({ message: 'You are not enrolled in this class' });
    }

    // Check if submission already exists
    const existingSubmission = await AssignmentSubmission.findOne({
      assignmentId: id,
      studentId: studentData._id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Assignment already submitted. You can update your submission.' });
    }

    // Validate attachments count
    if (attachments && attachments.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed' });
    }

    // Create submission
    const submission = new AssignmentSubmission({
      assignmentId: id,
      studentId: studentData._id,
      submissionText,
      attachments: attachments || []
    });

    await submission.save();

    // Populate student and assignment data
    await submission.populate('studentId', 'firstName lastName studentId');
    await submission.populate('assignmentId', 'title');

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission
    });

  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update assignment submission
// @route   PUT /api/assignments/:id/submit
// @access  Private (Student)
const updateSubmission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { submissionText, attachments } = req.body;

    // Get student data
    const studentData = await Student.findOne({ userId: req.user.id });
    if (!studentData) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Find existing submission
    const submission = await AssignmentSubmission.findOne({
      assignmentId: id,
      studentId: studentData._id
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Don't allow updates if already graded
    if (submission.marks !== null && submission.marks !== undefined) {
      return res.status(400).json({ message: 'Cannot update submission after it has been graded' });
    }

    // Validate attachments count
    if (attachments && attachments.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed' });
    }

    // Update submission
    submission.submissionText = submissionText;
    submission.attachments = attachments || [];

    await submission.save();

    // Populate and return updated submission
    await submission.populate('studentId', 'firstName lastName studentId');
    await submission.populate('assignmentId', 'title');

    res.json({
      message: 'Submission updated successfully',
      submission
    });

  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get assignment submissions (Admin)
// @route   GET /api/assignments/:id/submissions
// @access  Private (Admin/Moderator)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify assignment exists
    const assignment = await Assignment.findById(id).populate('classId', 'title grade enrolledStudents');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Get all submissions for this assignment
    const submissions = await AssignmentSubmission.find({ assignmentId: id })
      .populate('studentId', 'firstName lastName studentId profilePicture')
      .populate('gradedBy', 'fullName')
      .sort({ submittedAt: -1 });

    // Get enrolled students who haven't submitted
    const submittedStudentIds = submissions.map(s => s.studentId._id.toString());
    const enrolledStudents = await Student.find({
      _id: { $in: assignment.classId.enrolledStudents }
    }).select('firstName lastName studentId profilePicture');

    const notSubmittedStudents = enrolledStudents.filter(student =>
      !submittedStudentIds.includes(student._id.toString())
    );

    res.json({
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        classId: assignment.classId
      },
      submissions,
      notSubmittedStudents,
      stats: {
        totalEnrolled: enrolledStudents.length,
        submitted: submissions.length,
        notSubmitted: notSubmittedStudents.length,
        graded: submissions.filter(s => s.marks !== null && s.marks !== undefined).length
      }
    });

  } catch (error) {
    console.error('Get assignment submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Grade assignment submission
// @route   PUT /api/assignments/submissions/:submissionId/grade
// @access  Private (Admin/Moderator)
const gradeSubmission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { submissionId } = req.params;
    const { marks, feedback } = req.body;

    // Find submission
    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('studentId', 'firstName lastName studentId')
      .populate('assignmentId', 'title');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Validate marks
    if (marks < 0 || marks > 100) {
      return res.status(400).json({ message: 'Marks must be between 0 and 100' });
    }

    // Update submission with grade
    submission.marks = marks;
    submission.feedback = feedback || '';
    submission.gradedBy = req.user.id;
    submission.gradedAt = Date.now();
    submission.status = 'graded';

    await submission.save();

    // Populate graded by information
    await submission.populate('gradedBy', 'fullName');

    res.json({
      message: 'Submission graded successfully',
      submission
    });

  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get submission by ID
// @route   GET /api/assignments/submissions/:submissionId
// @access  Private (Admin/Moderator/Student)
const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('studentId', 'firstName lastName studentId profilePicture')
      .populate('assignmentId', 'title description')
      .populate('gradedBy', 'fullName');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // For students, only allow viewing their own submissions
    if (req.user.role === 'student') {
      const studentData = await Student.findOne({ userId: req.user.id });
      if (!studentData || submission.studentId._id.toString() !== studentData._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ submission });

  } catch (error) {
    console.error('Get submission by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createAssignment,
  getClassAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  togglePublishAssignment,
  submitAssignment,
  updateSubmission,
  getAssignmentSubmissions,
  gradeSubmission,
  getSubmissionById
};
