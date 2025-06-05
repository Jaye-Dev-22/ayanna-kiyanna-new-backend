const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { validationResult } = require('express-validator');

// Helper function to check if exam is overdue
const isExamOverdue = (examDate, examEndTime) => {
  if (!examDate || !examEndTime) return false;

  const now = new Date();
  const examDateTime = new Date(examDate);
  const [hours, minutes] = examEndTime.split(':');
  examDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return now > examDateTime;
};

// Helper function to check if exam has assigned marks
const hasAssignedMarks = async (examId) => {
  const marks = await ExamMark.findOne({ examId });
  return !!marks;
};

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private (Admin/Moderator)
const createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, guidelines, examLink, classId, examDate, examStartTime, examEndTime, isPublished } = req.body;

    // Check if class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Create exam
    const exam = new Exam({
      title,
      description,
      guidelines: guidelines || [],
      examLink: examLink || undefined,
      classId,
      examDate: examDate || undefined,
      examStartTime: examStartTime || undefined,
      examEndTime: examEndTime || undefined,
      isPublished: isPublished || false,
      createdBy: req.user.id
    });

    // Set publishedAt if creating as published
    if (isPublished && !exam.publishedAt) {
      exam.publishedAt = Date.now();
    }

    await exam.save();

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get all exams for a class
// @route   GET /api/exams/class/:classId
// @access  Private (Admin/Moderator/Student)
const getClassExams = async (req, res) => {
  try {
    const { classId } = req.params;
    const { published } = req.query;

    // Build filter
    const filter = { classId };
    
    // For students, only show published exams
    if (req.user.role === 'student' || published === 'true') {
      filter.isPublished = true;
    }

    const exams = await Exam.find(filter)
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    // Add overdue and marks status for each exam
    const examsWithStatus = await Promise.all(exams.map(async (exam) => {
      const examObj = exam.toObject();
      examObj.isOverdue = isExamOverdue(exam.examDate, exam.examEndTime);
      examObj.hasMarks = await hasAssignedMarks(exam._id);
      return examObj;
    }));

    res.json({
      success: true,
      exams: examsWithStatus
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get exam by ID
// @route   GET /api/exams/:id
// @access  Private (Admin/Moderator/Student)
const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('classId', 'grade category type');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // For students, only allow access to published exams
    if (req.user.role === 'student' && !exam.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add status information
    const examObj = exam.toObject();
    examObj.isOverdue = isExamOverdue(exam.examDate, exam.examEndTime);
    examObj.hasMarks = await hasAssignedMarks(exam._id);

    res.json({
      success: true,
      exam: examObj
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Admin/Moderator)
const updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, guidelines, examLink, examDate, examStartTime, examEndTime, isPublished } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Update fields
    exam.title = title || exam.title;
    exam.description = description || exam.description;
    exam.guidelines = guidelines !== undefined ? guidelines : exam.guidelines;
    exam.examLink = examLink !== undefined ? examLink : exam.examLink;
    exam.examDate = examDate !== undefined ? examDate : exam.examDate;
    exam.examStartTime = examStartTime !== undefined ? examStartTime : exam.examStartTime;
    exam.examEndTime = examEndTime !== undefined ? examEndTime : exam.examEndTime;
    
    // Handle publishing
    if (isPublished !== undefined) {
      exam.isPublished = isPublished;
      if (isPublished && !exam.publishedAt) {
        exam.publishedAt = Date.now();
      }
    }

    await exam.save();

    res.json({
      success: true,
      message: 'Exam updated successfully',
      exam
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin/Moderator)
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Delete associated marks
    await ExamMark.deleteMany({ examId: req.params.id });

    // Delete exam
    await Exam.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Assign marks to student for exam
// @route   POST /api/exams/:id/marks
// @access  Private (Admin/Moderator)
const assignMarks = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { studentId, marks, remarks } = req.body;
    const examId = req.params.id;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if student exists and is enrolled in the class
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is enrolled in the exam's class
    const classData = await Class.findById(exam.classId);
    if (!classData.enrolledStudents.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in this class'
      });
    }

    // Check if marks already exist for this student and exam
    let examMark = await ExamMark.findOne({ examId, studentId });

    if (examMark) {
      // Update existing marks
      examMark.marks = marks;
      examMark.remarks = remarks;
      examMark.assignedBy = req.user.id;
      await examMark.save();
    } else {
      // Create new marks
      examMark = new ExamMark({
        examId,
        studentId,
        marks,
        remarks,
        assignedBy: req.user.id
      });
      await examMark.save();
    }

    // Populate the response
    await examMark.populate('studentId', 'firstName lastName studentId');
    await examMark.populate('assignedBy', 'fullName');

    res.json({
      success: true,
      message: 'Marks assigned successfully',
      examMark
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get marks for an exam
// @route   GET /api/exams/:id/marks
// @access  Private (Admin/Moderator/Student)
const getExamMarks = async (req, res) => {
  try {
    const examId = req.params.id;
    const { search } = req.query;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    let filter = { examId };

    // For students, only show their own marks
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
      filter.studentId = student._id;
    }

    let marks = await ExamMark.find(filter)
      .populate('studentId', 'firstName lastName studentId')
      .populate('assignedBy', 'fullName')
      .sort({ createdAt: -1 });

    // Apply search filter for admin/moderator
    if (search && req.user.role !== 'student') {
      marks = marks.filter(mark =>
        mark.studentId.firstName.toLowerCase().includes(search.toLowerCase()) ||
        mark.studentId.lastName.toLowerCase().includes(search.toLowerCase()) ||
        mark.studentId.studentId.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      marks
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get enrolled students for exam marks assignment
// @route   GET /api/exams/:id/students
// @access  Private (Admin/Moderator)
const getExamStudents = async (req, res) => {
  try {
    const examId = req.params.id;
    const { search } = req.query;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Get class with enrolled students
    const classData = await Class.findById(exam.classId)
      .populate('enrolledStudents', 'firstName lastName studentId');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    let students = classData.enrolledStudents;

    // Apply search filter
    if (search) {
      students = students.filter(student =>
        student.firstName.toLowerCase().includes(search.toLowerCase()) ||
        student.lastName.toLowerCase().includes(search.toLowerCase()) ||
        student.studentId.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Get existing marks for these students
    const existingMarks = await ExamMark.find({
      examId,
      studentId: { $in: students.map(s => s._id) }
    });

    // Add marks information to students
    const studentsWithMarks = students.map(student => {
      const mark = existingMarks.find(m => m.studentId.toString() === student._id.toString());
      return {
        ...student.toObject(),
        examMark: mark ? {
          marks: mark.marks,
          remarks: mark.remarks,
          assignedAt: mark.updatedAt
        } : null
      };
    });

    res.json({
      success: true,
      students: studentsWithMarks
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Toggle exam publish status
// @route   PUT /api/exams/:id/publish
// @access  Private (Admin/Moderator)
const togglePublishExam = async (req, res) => {
  try {
    const { isPublished } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Update publish status
    exam.isPublished = isPublished;
    if (isPublished && !exam.publishedAt) {
      exam.publishedAt = Date.now();
    }

    await exam.save();

    res.json({
      success: true,
      message: `Exam ${isPublished ? 'published' : 'unpublished'} successfully`,
      exam
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

module.exports = {
  createExam,
  getClassExams,
  getExamById,
  updateExam,
  deleteExam,
  assignMarks,
  getExamMarks,
  getExamStudents,
  togglePublishExam
};
