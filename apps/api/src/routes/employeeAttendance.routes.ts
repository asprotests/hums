import { Router, type Router as RouterType } from 'express';
import { employeeAttendanceService } from '../services/employeeAttendance.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  manualEntrySchema,
  employeeAttendanceQuerySchema,
  dailyAttendanceQuerySchema,
  reportQuerySchema,
  lateArrivalsQuerySchema,
  absenteesQuerySchema,
  markOnLeaveSchema,
  markHolidaySchema,
} from '../validators/employeeAttendance.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Check-in for current user's employee record
 * POST /api/v1/employee-attendance/check-in
 */
router.post(
  '/check-in',
  authorize('attendance:create'),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.body;

    // If no employeeId provided, use current user's employee record
    let targetEmployeeId = employeeId;

    if (!targetEmployeeId && req.user?.employeeId) {
      targetEmployeeId = req.user.employeeId;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID required',
      });
    }

    const result = await employeeAttendanceService.checkIn(targetEmployeeId);
    return sendCreated(res, result, 'Check-in recorded successfully');
  })
);

/**
 * Check-out for current user's employee record
 * POST /api/v1/employee-attendance/check-out
 */
router.post(
  '/check-out',
  authorize('attendance:create'),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.body;

    let targetEmployeeId = employeeId;

    if (!targetEmployeeId && req.user?.employeeId) {
      targetEmployeeId = req.user.employeeId;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID required',
      });
    }

    const result = await employeeAttendanceService.checkOut(targetEmployeeId);
    return sendSuccess(res, result, 'Check-out recorded successfully');
  })
);

/**
 * Manual attendance entry
 * POST /api/v1/employee-attendance/manual
 */
router.post(
  '/manual',
  authorize('attendance:create'),
  validate(manualEntrySchema),
  asyncHandler(async (req, res) => {
    const { employeeId, date, checkIn, checkOut, status, remarks } = req.body;

    const result = await employeeAttendanceService.manualEntry(
      {
        employeeId,
        date: new Date(date),
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        status,
        remarks,
      },
      req.user!.userId
    );

    return sendCreated(res, result, 'Attendance entry recorded successfully');
  })
);

/**
 * Get employee attendance for a month
 * GET /api/v1/employee-attendance/employee/:employeeId
 */
router.get(
  '/employee/:employeeId',
  authorize('attendance:read'),
  validate(employeeAttendanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const result = await employeeAttendanceService.getEmployeeAttendance(
      employeeId,
      Number(month),
      Number(year)
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get attendance summary for an employee
 * GET /api/v1/employee-attendance/employee/:employeeId/summary
 */
router.get(
  '/employee/:employeeId/summary',
  authorize('attendance:read'),
  validate(employeeAttendanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const result = await employeeAttendanceService.getAttendanceSummary(
      employeeId,
      Number(month),
      Number(year)
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get daily attendance for all employees
 * GET /api/v1/employee-attendance/daily
 */
router.get(
  '/daily',
  authorize('attendance:read'),
  validate(dailyAttendanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, departmentId } = req.query;

    const attendanceDate = date ? new Date(date as string) : new Date();

    const result = await employeeAttendanceService.getDailyAttendance(
      attendanceDate,
      departmentId as string
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get today's attendance
 * GET /api/v1/employee-attendance/today
 */
router.get(
  '/today',
  authorize('attendance:read'),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query;

    const result = await employeeAttendanceService.getTodayAttendance(
      departmentId as string
    );

    return sendSuccess(res, result);
  })
);

/**
 * Generate monthly report
 * GET /api/v1/employee-attendance/report
 */
router.get(
  '/report',
  authorize('attendance:read'),
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { departmentId, month, year } = req.query;

    const result = await employeeAttendanceService.generateMonthlyReport(
      departmentId as string | undefined,
      Number(month),
      Number(year)
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get late arrivals for a date
 * GET /api/v1/employee-attendance/late-arrivals
 */
router.get(
  '/late-arrivals',
  authorize('attendance:read'),
  validate(lateArrivalsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, graceMinutes } = req.query;

    const result = await employeeAttendanceService.getLateArrivals(
      new Date(date as string),
      graceMinutes ? Number(graceMinutes) : undefined
    );

    return sendSuccess(res, result);
  })
);

/**
 * Get absentees for a date
 * GET /api/v1/employee-attendance/absentees
 */
router.get(
  '/absentees',
  authorize('attendance:read'),
  validate(absenteesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, departmentId } = req.query;

    const result = await employeeAttendanceService.getAbsentees(
      new Date(date as string),
      departmentId as string
    );

    return sendSuccess(res, result);
  })
);

/**
 * Mark employee as on leave
 * POST /api/v1/employee-attendance/mark-leave
 */
router.post(
  '/mark-leave',
  authorize('attendance:create'),
  validate(markOnLeaveSchema),
  asyncHandler(async (req, res) => {
    const { employeeId, date, remarks } = req.body;

    const result = await employeeAttendanceService.markOnLeave(
      employeeId,
      new Date(date),
      remarks
    );

    return sendSuccess(res, result, 'Employee marked as on leave');
  })
);

/**
 * Mark a date as holiday
 * POST /api/v1/employee-attendance/mark-holiday
 */
router.post(
  '/mark-holiday',
  authorize('attendance:create'),
  validate(markHolidaySchema),
  asyncHandler(async (req, res) => {
    const { date, departmentId, remarks } = req.body;

    const result = await employeeAttendanceService.markHoliday(
      new Date(date),
      departmentId,
      remarks
    );

    return sendSuccess(res, result, 'Holiday marked successfully');
  })
);

export default router;
