import { Router, type Router as RouterType } from 'express';
import { examService } from '../services/exam.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createExamSchema,
  updateExamSchema,
  examQuerySchema,
  cancelExamSchema,
} from '../validators/grading.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/exams
 * @desc    Get exams with filters
 * @access  Private (exams:read)
 */
router.get(
  '/',
  authorize('exams:read'),
  validate(examQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const exams = await examService.getExams(req.query as any);
    return sendSuccess(res, exams);
  })
);

/**
 * @route   POST /api/v1/exams
 * @desc    Schedule a new exam
 * @access  Private (exams:create)
 */
router.post(
  '/',
  authorize('exams:create'),
  validate(createExamSchema),
  asyncHandler(async (req, res) => {
    const result = await examService.scheduleExam(req.body, req.user?.userId);

    // Include warnings about conflicts in the response
    const message = result.conflicts.length > 0
      ? `Exam scheduled with ${result.conflicts.length} conflict warning(s)`
      : 'Exam scheduled successfully';

    return sendCreated(res, result, message);
  })
);

/**
 * @route   GET /api/v1/exams/schedule/:semesterId
 * @desc    Get exam schedule for a semester
 * @access  Private (exams:read)
 */
router.get(
  '/schedule/:semesterId',
  authorize('exams:read'),
  asyncHandler(async (req, res) => {
    const schedule = await examService.getExamSchedule(req.params.semesterId);
    return sendSuccess(res, schedule);
  })
);

/**
 * @route   GET /api/v1/exams/student/:studentId
 * @desc    Get upcoming exams for a student
 * @access  Private (exams:read)
 */
router.get(
  '/student/:studentId',
  authorize('exams:read'),
  asyncHandler(async (req, res) => {
    const exams = await examService.getStudentExams(req.params.studentId);
    return sendSuccess(res, exams);
  })
);

/**
 * @route   GET /api/v1/exams/class/:classId
 * @desc    Get exams for a class
 * @access  Private (exams:read)
 */
router.get(
  '/class/:classId',
  authorize('exams:read'),
  asyncHandler(async (req, res) => {
    const exams = await examService.getClassExams(req.params.classId);
    return sendSuccess(res, exams);
  })
);

/**
 * @route   GET /api/v1/exams/:id
 * @desc    Get exam by ID
 * @access  Private (exams:read)
 */
router.get(
  '/:id',
  authorize('exams:read'),
  asyncHandler(async (req, res) => {
    const exam = await examService.getExam(req.params.id);
    return sendSuccess(res, exam);
  })
);

/**
 * @route   PATCH /api/v1/exams/:id
 * @desc    Update exam
 * @access  Private (exams:update)
 */
router.patch(
  '/:id',
  authorize('exams:update'),
  validate(updateExamSchema),
  asyncHandler(async (req, res) => {
    const exam = await examService.updateExam(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, exam, 'Exam updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/exams/:id
 * @desc    Delete exam
 * @access  Private (exams:delete)
 */
router.delete(
  '/:id',
  authorize('exams:delete'),
  asyncHandler(async (req, res) => {
    await examService.deleteExam(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Exam deleted successfully');
  })
);

/**
 * @route   POST /api/v1/exams/:id/cancel
 * @desc    Cancel an exam
 * @access  Private (exams:update)
 */
router.post(
  '/:id/cancel',
  authorize('exams:update'),
  validate(cancelExamSchema),
  asyncHandler(async (req, res) => {
    const exam = await examService.cancelExam(req.params.id, req.body.reason, req.user?.userId);
    return sendSuccess(res, exam, 'Exam cancelled successfully');
  })
);

/**
 * @route   GET /api/v1/exams/:id/check-conflicts
 * @desc    Check for scheduling conflicts for an exam
 * @access  Private (exams:read)
 */
router.get(
  '/:id/check-conflicts',
  authorize('exams:read'),
  asyncHandler(async (req, res) => {
    const exam = await examService.getExam(req.params.id);
    const conflicts = await examService.checkConflicts(
      exam.classId,
      exam.date,
      exam.startTime,
      exam.endTime
    );
    return sendSuccess(res, { conflicts });
  })
);

export default router;
