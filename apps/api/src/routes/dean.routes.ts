import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { hodDashboardService } from '../services/hodDashboard.service.js';
import { dashboardQuerySchema } from '../validators/academicPortal.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/dean/dashboard
 * Get Dean dashboard data (faculty-wide overview)
 */
router.get(
  '/dashboard',
  authorize('dean:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getDeanDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard);
  })
);

/**
 * GET /api/v1/dean/departments
 * Get all departments in the Dean's faculty
 */
router.get(
  '/departments',
  authorize('dean:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getDeanDashboard(
      userId,
      semesterId as string | undefined
    );

    return sendSuccess(res, dashboard.departments);
  })
);

/**
 * GET /api/v1/dean/reports/faculty-overview
 * Get faculty overview report
 */
router.get(
  '/reports/faculty-overview',
  authorize('dean:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getDeanDashboard(
      userId,
      semesterId as string | undefined
    );

    const report = {
      faculty: dashboard.faculty,
      semester: dashboard.currentSemester,
      overallStats: dashboard.overallStats,
      departmentComparison: dashboard.departments.map((d) => ({
        name: d.name,
        code: d.code,
        hodName: d.hodName,
        facultyCount: d.facultyCount,
        studentCount: d.studentCount,
        classCount: d.classCount,
        averageAttendance: d.averageAttendance,
      })),
      alerts: dashboard.alerts,
    };

    return sendSuccess(res, report);
  })
);

/**
 * GET /api/v1/dean/reports/student-performance
 * Get student performance report across the faculty
 */
router.get(
  '/reports/student-performance',
  authorize('dean:read'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    const userId = req.user!.userId;

    const dashboard = await hodDashboardService.getDeanDashboard(
      userId,
      semesterId as string | undefined
    );

    // Generate performance report by department
    const report = {
      faculty: dashboard.faculty,
      semester: dashboard.currentSemester,
      totalStudents: dashboard.overallStats.totalStudents,
      departmentPerformance: dashboard.departments.map((d) => ({
        name: d.name,
        code: d.code,
        studentCount: d.studentCount,
        averageAttendance: d.averageAttendance,
        // In a full implementation, would include average grades, pass rates, etc.
      })),
      overallAttendance: dashboard.overallStats.averageAttendance,
    };

    return sendSuccess(res, report);
  })
);

export default router;
