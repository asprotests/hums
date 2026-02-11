import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '@hums/database';
import { leaveRequestService } from '../services/leaveRequest.service.js';
import { leaveBalanceService } from '../services/leaveBalance.service.js';
import { payrollService } from '../services/payroll.service.js';
import { employeeLeaveRequestSchema } from '../validators/leavePayroll.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Helper to get employee ID from user
 */
async function getEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!employee) {
    throw AppError.forbidden('You must be an employee to access this resource');
  }

  return employee.id;
}

// ===========================================
// Employee Leave Self-Service
// ===========================================

/**
 * GET /api/v1/employee/leave-balances
 * Get current user's leave balances
 */
router.get(
  '/leave-balances',
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : new Date().getFullYear();

    const balances = await leaveBalanceService.getEmployeeBalances(employeeId, year);
    return sendSuccess(res, balances);
  })
);

/**
 * GET /api/v1/employee/leave-requests
 * Get current user's leave requests
 */
router.get(
  '/leave-requests',
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const requests = await leaveRequestService.getEmployeeRequests(employeeId, year);
    return sendSuccess(res, requests);
  })
);

/**
 * POST /api/v1/employee/leave-requests
 * Submit a new leave request
 */
router.post(
  '/leave-requests',
  validate(employeeLeaveRequestSchema),
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);

    const request = await leaveRequestService.submitRequest(
      employeeId,
      req.body,
      req.user!.userId
    );

    return sendCreated(res, request, 'Leave request submitted successfully');
  })
);

/**
 * DELETE /api/v1/employee/leave-requests/:id
 * Cancel own leave request
 */
router.delete(
  '/leave-requests/:id',
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);

    // Verify the request belongs to this employee
    const request = await leaveRequestService.getRequestById(req.params.id);
    if (request.employeeId !== employeeId) {
      throw AppError.forbidden('You can only cancel your own leave requests');
    }

    await leaveRequestService.cancelRequest(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Leave request cancelled');
  })
);

// ===========================================
// Employee Payroll Self-Service
// ===========================================

/**
 * GET /api/v1/employee/payslips
 * Get current user's payslips
 */
router.get(
  '/payslips',
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const payrolls = await payrollService.getEmployeePayrolls(employeeId, year);

    // Only return paid payslips to employees
    const paidPayrolls = payrolls.filter((p) => p.status === 'PAID');

    return sendSuccess(res, paidPayrolls);
  })
);

/**
 * GET /api/v1/employee/payslips/:id
 * Get a specific payslip
 */
router.get(
  '/payslips/:id',
  asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeId(req.user!.userId);

    const payroll = await payrollService.getPayrollById(req.params.id);

    // Verify the payroll belongs to this employee
    if (payroll.employeeId !== employeeId) {
      throw AppError.forbidden('You can only view your own payslips');
    }

    // Only show paid payslips
    if (payroll.status !== 'PAID') {
      throw AppError.notFound('Payslip not found');
    }

    return sendSuccess(res, payroll);
  })
);

/**
 * GET /api/v1/employee/profile
 * Get current employee profile
 */
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            faculty: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!employee) {
      throw AppError.forbidden('You must be an employee to access this resource');
    }

    return sendSuccess(res, employee);
  })
);

export default router;
