import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import { leaveRequestService } from '../services/leaveRequest.service.js';
import { leaveBalanceService } from '../services/leaveBalance.service.js';
import {
  createLeaveRequestSchema,
  approveRejectLeaveSchema,
  leaveRequestQuerySchema,
  leaveCalendarQuerySchema,
  leaveBalanceQuerySchema,
  allocateLeaveSchema,
  carryForwardSchema,
} from '../validators/leavePayroll.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// ===========================================
// Leave Request Routes
// ===========================================

/**
 * GET /api/v1/leave-requests
 * Get all leave requests with filters
 */
router.get(
  '/',
  authorize('leave:read'),
  validate(leaveRequestQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, employeeId, leaveTypeId, startDate, endDate, page, limit } = req.query;
    const result = await leaveRequestService.getRequests(
      {
        status: status as any,
        employeeId: employeeId as string,
        leaveTypeId: leaveTypeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * GET /api/v1/leave-requests/pending
 * Get pending leave requests for approval
 */
router.get(
  '/pending',
  authorize('leave:approve'),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query;
    const requests = await leaveRequestService.getPendingApprovals(
      req.user!.userId,
      departmentId as string | undefined
    );
    return sendSuccess(res, requests);
  })
);

/**
 * GET /api/v1/leave-requests/calendar
 * Get leave calendar for a month
 */
router.get(
  '/calendar',
  authorize('leave:read'),
  validate(leaveCalendarQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { month, year, departmentId } = req.query;
    const leaves = await leaveRequestService.getLeaveCalendar(
      parseInt(month as string),
      parseInt(year as string),
      departmentId as string | undefined
    );
    return sendSuccess(res, leaves);
  })
);

/**
 * GET /api/v1/leave-requests/balance/:employeeId
 * Get employee's leave balances
 */
router.get(
  '/balance/:employeeId',
  authorize('leave:read'),
  validate(leaveBalanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { year } = req.query;
    const balances = await leaveBalanceService.getEmployeeBalances(
      req.params.employeeId,
      year ? parseInt(year as string) : undefined
    );
    return sendSuccess(res, balances);
  })
);

/**
 * GET /api/v1/leave-requests/employee/:employeeId
 * Get employee's leave requests
 */
router.get(
  '/employee/:employeeId',
  authorize('leave:read'),
  validate(leaveBalanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { year } = req.query;
    const requests = await leaveRequestService.getEmployeeRequests(
      req.params.employeeId,
      year ? parseInt(year as string) : undefined
    );
    return sendSuccess(res, requests);
  })
);

/**
 * GET /api/v1/leave-requests/:id
 * Get a specific leave request
 */
router.get(
  '/:id',
  authorize('leave:read'),
  asyncHandler(async (req, res) => {
    const request = await leaveRequestService.getRequestById(req.params.id);
    return sendSuccess(res, request);
  })
);

/**
 * POST /api/v1/leave-requests
 * Create a new leave request (admin creating on behalf of employee)
 */
router.post(
  '/',
  authorize('leave:create'),
  validate(createLeaveRequestSchema),
  asyncHandler(async (req, res) => {
    const { employeeId, ...data } = req.body;
    const request = await leaveRequestService.submitRequest(
      employeeId,
      data,
      req.user!.userId
    );
    return sendCreated(res, request);
  })
);

/**
 * POST /api/v1/leave-requests/:id/approve
 * Approve a leave request
 */
router.post(
  '/:id/approve',
  authorize('leave:approve'),
  validate(approveRejectLeaveSchema),
  asyncHandler(async (req, res) => {
    const { remarks } = req.body;
    const request = await leaveRequestService.approveRequest(
      req.params.id,
      req.user!.userId,
      remarks
    );
    return sendSuccess(res, request, 'Leave request approved');
  })
);

/**
 * POST /api/v1/leave-requests/:id/reject
 * Reject a leave request
 */
router.post(
  '/:id/reject',
  authorize('leave:approve'),
  validate(approveRejectLeaveSchema),
  asyncHandler(async (req, res) => {
    const { remarks } = req.body;
    const request = await leaveRequestService.rejectRequest(
      req.params.id,
      req.user!.userId,
      remarks || ''
    );
    return sendSuccess(res, request, 'Leave request rejected');
  })
);

/**
 * DELETE /api/v1/leave-requests/:id
 * Cancel a leave request
 */
router.delete(
  '/:id',
  authorize('leave:delete'),
  asyncHandler(async (req, res) => {
    await leaveRequestService.cancelRequest(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Leave request cancelled');
  })
);

// ===========================================
// Leave Balance Administration Routes
// ===========================================

/**
 * POST /api/v1/leave-requests/allocate
 * Allocate leave to an employee
 */
router.post(
  '/allocate',
  authorize('leave:create'),
  validate(allocateLeaveSchema),
  asyncHandler(async (req, res) => {
    const { employeeId, leaveTypeId, year, days } = req.body;
    const balance = await leaveBalanceService.allocateLeave(
      employeeId,
      leaveTypeId,
      year,
      days,
      req.user!.userId
    );
    return sendSuccess(res, balance, 'Leave allocated successfully');
  })
);

/**
 * POST /api/v1/leave-requests/carry-forward
 * Carry forward unused leave to next year
 */
router.post(
  '/carry-forward',
  authorize('leave:create'),
  validate(carryForwardSchema),
  asyncHandler(async (req, res) => {
    const { year } = req.body;
    const result = await leaveBalanceService.carryForwardLeaves(year, req.user!.userId);
    return sendSuccess(res, result, 'Leave carry forward completed');
  })
);

/**
 * POST /api/v1/leave-requests/reset-annual
 * Reset annual leave allocations for all employees
 */
router.post(
  '/reset-annual',
  authorize('leave:create'),
  validate(carryForwardSchema),
  asyncHandler(async (req, res) => {
    const { year } = req.body;
    const result = await leaveBalanceService.resetAnnualLeaves(year, req.user!.userId);
    return sendSuccess(res, result, 'Annual leave allocations reset');
  })
);

export default router;
