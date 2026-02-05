import { Router, type Router as RouterType } from 'express';
import { enrollmentService } from '../services/enrollment.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  enrollStudentSchema,
  dropStudentSchema,
  bulkEnrollSchema,
  enrollmentQuerySchema,
  prerequisiteCheckSchema,
  scheduleConflictCheckSchema,
} from '../validators/enrollment.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { AppError } from '../utils/AppError.js';
import { z } from 'zod';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/enrollments
 * @desc Get all enrollments with filters
 * @access Private (enrollments:read)
 */
router.get(
  '/',
  authorize('enrollments:read'),
  validate(enrollmentQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = req.query as {
      studentId?: string;
      classId?: string;
      semesterId?: string;
      status?: 'REGISTERED' | 'DROPPED' | 'COMPLETED' | 'FAILED';
    };

    const enrollments = await enrollmentService.getEnrollments(filters);
    return sendSuccess(res, enrollments);
  })
);

/**
 * @route GET /api/v1/enrollments/student/:studentId/schedule
 * @desc Get student's schedule
 * @access Private (enrollments:read or own schedule)
 */
router.get(
  '/student/:studentId/schedule',
  validate(z.object({ semesterId: z.string().optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { semesterId } = req.query as { semesterId?: string };

    const hasPermission = req.user?.permissions?.includes('enrollments:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to view this schedule');
    }

    const schedule = await enrollmentService.getStudentSchedule(studentId, semesterId);
    return sendSuccess(res, schedule);
  })
);

/**
 * @route GET /api/v1/enrollments/student/:studentId/available-classes
 * @desc Get available classes for a student to register
 * @access Private (enrollments:read or own classes)
 */
router.get(
  '/student/:studentId/available-classes',
  validate(z.object({ semesterId: z.string().optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { semesterId } = req.query as { semesterId?: string };

    const hasPermission = req.user?.permissions?.includes('enrollments:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to view available classes');
    }

    const classes = await enrollmentService.getAvailableClasses(studentId, semesterId);
    return sendSuccess(res, classes);
  })
);

/**
 * @route POST /api/v1/enrollments/check-prerequisites
 * @desc Check if a student has met prerequisites for a course
 * @access Private (enrollments:read or own check)
 */
router.post(
  '/check-prerequisites',
  validate(prerequisiteCheckSchema),
  asyncHandler(async (req, res) => {
    const { studentId, courseId } = req.body;

    const hasPermission = req.user?.permissions?.includes('enrollments:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to perform this check');
    }

    const result = await enrollmentService.checkPrerequisites(studentId, courseId);
    return sendSuccess(res, result);
  })
);

/**
 * @route POST /api/v1/enrollments/check-schedule-conflicts
 * @desc Check for schedule conflicts
 * @access Private (enrollments:read or own check)
 */
router.post(
  '/check-schedule-conflicts',
  validate(scheduleConflictCheckSchema),
  asyncHandler(async (req, res) => {
    const { studentId, classId } = req.body;

    const hasPermission = req.user?.permissions?.includes('enrollments:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to perform this check');
    }

    const result = await enrollmentService.checkScheduleConflicts(studentId, classId);
    return sendSuccess(res, result);
  })
);

/**
 * @route GET /api/v1/enrollments/:id
 * @desc Get enrollment by ID
 * @access Private (enrollments:read or own enrollment)
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const enrollment = await enrollmentService.getEnrollmentById(req.params.id);

    const hasPermission = req.user?.permissions?.includes('enrollments:read');
    const isOwnRecord = enrollment.studentId === req.user?.studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to view this enrollment');
    }

    return sendSuccess(res, enrollment);
  })
);

/**
 * @route POST /api/v1/enrollments
 * @desc Enroll a student in a class
 * @access Private (enrollments:create)
 */
router.post(
  '/',
  authorize('enrollments:create'),
  validate(enrollStudentSchema),
  asyncHandler(async (req, res) => {
    const enrollment = await enrollmentService.enrollStudent(
      req.body,
      req.user?.userId
    );
    return sendCreated(res, enrollment, 'Student enrolled successfully');
  })
);

/**
 * @route POST /api/v1/enrollments/drop
 * @desc Drop a student from a class
 * @access Private (enrollments:delete)
 */
router.post(
  '/drop',
  authorize('enrollments:delete'),
  validate(dropStudentSchema),
  asyncHandler(async (req, res) => {
    const enrollment = await enrollmentService.dropStudent(
      req.body,
      req.user?.userId
    );
    return sendSuccess(res, enrollment, 'Student dropped from class successfully');
  })
);

/**
 * @route POST /api/v1/enrollments/bulk
 * @desc Bulk enroll students in a class
 * @access Private (enrollments:create)
 */
router.post(
  '/bulk',
  authorize('enrollments:create'),
  validate(bulkEnrollSchema),
  asyncHandler(async (req, res) => {
    const result = await enrollmentService.bulkEnroll(
      req.body,
      req.user?.userId
    );
    return sendSuccess(res, result);
  })
);

export default router;
