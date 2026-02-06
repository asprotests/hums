import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { hodDashboardService } from '../services/hodDashboard.service.js';
import {
  dashboardQuerySchema,
  assignLecturerSchema,
  attendanceReportQuerySchema,
} from '../validators/academicPortal.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/hod/dashboard
 * Get HOD dashboard data
 */
router.get(
  '/dashboard',
  authorize('hod:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard);
  })
);

/**
 * GET /api/v1/hod/classes
 * Get all classes in the HOD's department
 */
router.get(
  '/classes',
  authorize('hod:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard.classesOverview);
  })
);

/**
 * GET /api/v1/hod/faculty
 * Get all faculty in the HOD's department
 */
router.get(
  '/faculty',
  authorize('hod:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard.facultyWorkload);
  })
);

/**
 * GET /api/v1/hod/faculty/:id/workload
 * Get workload details for a specific faculty member
 */
router.get(
  '/faculty/:id/workload',
  authorize('hod:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    const facultyMember = dashboard.facultyWorkload.find((f) => f.lecturerId === id);

    if (!facultyMember) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found in your department',
      });
    }

    // Get their classes
    const classes = dashboard.classesOverview.filter((c) => c.lecturerId === id);

    return sendSuccess(res, {
      ...facultyMember,
      classes,
    });
  })
);

/**
 * POST /api/v1/hod/classes/:id/assign-lecturer
 * Assign a lecturer to a class
 */
router.post(
  '/classes/:id/assign-lecturer',
  authorize('hod:update'),
  validate(assignLecturerSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lecturerId } = req.body;
    const userId = req.user!.userId;

    await hodDashboardService.assignLecturerToClass(id, lecturerId, userId);

    return sendSuccess(res, null, 'Lecturer assigned successfully');
  })
);

/**
 * GET /api/v1/hod/reports/attendance
 * Get attendance report for the department
 */
router.get(
  '/reports/attendance',
  authorize('hod:read'),
  validate(attendanceReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    // Return attendance-specific data
    const report = {
      department: dashboard.department,
      semester: dashboard.currentSemester,
      alerts: dashboard.attendanceAlerts,
      classSummary: dashboard.classesOverview.map((c) => ({
        classId: c.id,
        className: c.name,
        courseName: c.courseName,
        lecturerName: c.lecturerName,
        attendanceRate: c.attendanceRate,
        enrolledCount: c.enrolledCount,
      })),
      facultyAttendance: dashboard.facultyWorkload.map((f) => ({
        lecturerName: f.lecturerName,
        averageAttendance: f.averageAttendance,
        classCount: f.classCount,
      })),
    };

    return sendSuccess(res, report);
  })
);

/**
 * GET /api/v1/hod/reports/grading-progress
 * Get grading progress report for the department
 */
router.get(
  '/reports/grading-progress',
  authorize('hod:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getHODDashboard(
      userId,
      semesterId as string | undefined
    );

    // Return grading-specific data
    const report = {
      department: dashboard.department,
      semester: dashboard.currentSemester,
      gradingProgress: dashboard.gradingProgress,
      overdueSummary: dashboard.gradingProgress.filter((c) =>
        c.components.some((comp) => comp.isOverdue)
      ),
      facultyProgress: dashboard.facultyWorkload.map((f) => ({
        lecturerName: f.lecturerName,
        gradingProgress: f.gradingProgress,
        classCount: f.classCount,
      })),
    };

    return sendSuccess(res, report);
  })
);

export default router;
