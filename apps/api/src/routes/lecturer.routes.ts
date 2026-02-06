import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { lecturerDashboardService } from '../services/lecturerDashboard.service.js';
import {
  dashboardQuerySchema,
  scheduleQuerySchema,
} from '../validators/academicPortal.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/lecturer/dashboard
 * Get lecturer dashboard data
 */
router.get(
  '/dashboard',
  authorize('lecturer:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await lecturerDashboardService.getLecturerDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard);
  })
);

/**
 * GET /api/v1/lecturer/classes
 * Get all classes for the current lecturer
 */
router.get(
  '/classes',
  authorize('lecturer:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const classes = await lecturerDashboardService.getLecturerClasses(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, classes);
  })
);

/**
 * GET /api/v1/lecturer/classes/:id
 * Get details for a specific class
 */
router.get(
  '/classes/:id',
  authorize('lecturer:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Get all classes and find the specific one
    const classes = await lecturerDashboardService.getLecturerClasses(userId);
    const classData = classes.find((c) => c.classId === id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or you do not have access',
      });
    }

    return sendSuccess(res, classData);
  })
);

/**
 * GET /api/v1/lecturer/schedule
 * Get lecturer's schedule for a specific date
 */
router.get(
  '/schedule',
  authorize('lecturer:read'),
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    const userId = req.user!.userId;

    const schedule = await lecturerDashboardService.getLecturerSchedule(
      userId,
      date ? new Date(date as string) : new Date()
    );

    return sendSuccess(res, schedule);
  })
);

/**
 * GET /api/v1/lecturer/pending-tasks
 * Get pending tasks for the lecturer
 */
router.get(
  '/pending-tasks',
  authorize('lecturer:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await lecturerDashboardService.getLecturerDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard.pendingTasks);
  })
);

export default router;
