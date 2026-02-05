import { Router, type Router as RouterType } from 'express';
import { studentAttendanceService } from '../services/studentAttendance.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  markAttendanceSchema,
  updateAttendanceSchema,
  submitExcuseSchema,
  reviewExcuseSchema,
  rejectExcuseSchema,
  belowThresholdQuerySchema,
} from '../validators/studentAttendance.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Mark attendance for a class (bulk)
 * POST /api/v1/attendance/class/:classId/mark
 */
router.post(
  '/class/:classId/mark',
  authorize('attendance:create'),
  validate(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { date, records } = req.body;

    const result = await studentAttendanceService.markAttendance(
      { classId, date: new Date(date), records },
      req.user!.userId
    );

    return sendCreated(res, result, 'Attendance marked successfully');
  })
);

/**
 * Get attendance for a class on a specific date
 * GET /api/v1/attendance/class/:classId
 */
router.get(
  '/class/:classId',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { date, startDate, endDate } = req.query;

    if (startDate && endDate) {
      const result = await studentAttendanceService.getClassAttendanceByDateRange(
        classId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      return sendSuccess(res, result);
    }

    if (!date) {
      return sendSuccess(res, [], 'Date parameter is required');
    }

    const result = await studentAttendanceService.getClassAttendance(
      classId,
      new Date(date as string)
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get class attendance report
 * GET /api/v1/attendance/class/:classId/report
 */
router.get(
  '/class/:classId/report',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const result = await studentAttendanceService.getClassAttendanceReport(classId);
    return sendSuccess(res, result);
  })
);

/**
 * Get students below threshold
 * GET /api/v1/attendance/class/:classId/below-threshold
 */
router.get(
  '/class/:classId/below-threshold',
  authorize('attendance:read'),
  validate(belowThresholdQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { threshold } = req.query;

    const result = await studentAttendanceService.getStudentsBelowThreshold(
      classId,
      threshold ? Number(threshold) : 75
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get attendance for a student
 * GET /api/v1/attendance/student/:studentId
 */
router.get(
  '/student/:studentId',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { classId, semesterId, startDate, endDate, status } = req.query;

    const result = await studentAttendanceService.getStudentAttendance({
      studentId,
      classId: classId as string,
      semesterId: semesterId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as any,
    });

    return sendSuccess(res, result);
  })
);

/**
 * Get attendance summary for a student
 * GET /api/v1/attendance/student/:studentId/summary
 */
router.get(
  '/student/:studentId/summary',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { semesterId } = req.query;

    const result = await studentAttendanceService.getStudentAttendanceSummary(
      studentId,
      semesterId as string
    );

    return sendSuccess(res, result);
  })
);

/**
 * Update attendance record
 * PATCH /api/v1/attendance/:id
 */
router.patch(
  '/:id',
  authorize('attendance:update'),
  validate(updateAttendanceSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const result = await studentAttendanceService.updateAttendance(
      id,
      status,
      req.user!.userId,
      remarks
    );

    return sendSuccess(res, result, 'Attendance updated successfully');
  })
);

// ==========================================
// EXCUSE MANAGEMENT
// ==========================================

/**
 * Submit excuse
 * POST /api/v1/attendance/excuse
 */
router.post(
  '/excuse',
  authorize('attendance:create'),
  validate(submitExcuseSchema),
  asyncHandler(async (req, res) => {
    const result = await studentAttendanceService.submitExcuse(
      req.body,
      req.user?.userId
    );

    return sendCreated(res, result, 'Excuse submitted successfully');
  })
);

/**
 * Get pending excuses
 * GET /api/v1/attendance/excuses/pending
 */
router.get(
  '/excuses/pending',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { classId } = req.query;
    const result = await studentAttendanceService.getPendingExcuses(
      classId as string
    );
    return sendSuccess(res, result);
  })
);

/**
 * Approve excuse
 * PATCH /api/v1/attendance/excuse/:id/approve
 */
router.patch(
  '/excuse/:id/approve',
  authorize('attendance:update'),
  validate(reviewExcuseSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;

    const result = await studentAttendanceService.approveExcuse(
      id,
      req.user!.userId,
      remarks
    );

    return sendSuccess(res, result, 'Excuse approved');
  })
);

/**
 * Reject excuse
 * PATCH /api/v1/attendance/excuse/:id/reject
 */
router.patch(
  '/excuse/:id/reject',
  authorize('attendance:update'),
  validate(rejectExcuseSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;

    const result = await studentAttendanceService.rejectExcuse(
      id,
      req.user!.userId,
      remarks
    );

    return sendSuccess(res, result, 'Excuse rejected');
  })
);

/**
 * Get student's excuses
 * GET /api/v1/attendance/student/:studentId/excuses
 */
router.get(
  '/student/:studentId/excuses',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const result = await studentAttendanceService.getStudentExcuses(studentId);
    return sendSuccess(res, result);
  })
);

export default router;
