import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import { payrollService } from '../services/payroll.service.js';
import {
  processPayrollSchema,
  payrollQuerySchema,
  bulkMarkPaidSchema,
  payrollReportQuerySchema,
} from '../validators/leavePayroll.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/payrolls
 * Get all payrolls with filters
 */
router.get(
  '/',
  authorize('payroll:read'),
  validate(payrollQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { month, year, status, employeeId, departmentId, page, limit } = req.query;
    const result = await payrollService.getPayrolls(
      {
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
        status: status as any,
        employeeId: employeeId as string,
        departmentId: departmentId as string,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * POST /api/v1/payrolls/process
 * Process payroll for a month
 */
router.post(
  '/process',
  authorize('payroll:create'),
  validate(processPayrollSchema),
  asyncHandler(async (req, res) => {
    const { month, year, departmentId } = req.body;
    const result = await payrollService.processPayroll(
      month,
      year,
      departmentId,
      req.user!.userId
    );
    return sendCreated(res, result, 'Payroll processed successfully');
  })
);

/**
 * GET /api/v1/payroll/report
 * Generate payroll report for a month
 */
router.get(
  '/report',
  authorize('payroll:read'),
  validate(payrollReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const report = await payrollService.generatePayrollReport(
      parseInt(month as string),
      parseInt(year as string)
    );
    return sendSuccess(res, report);
  })
);

/**
 * GET /api/v1/payroll/bank-file
 * Generate bank file for payroll
 */
router.get(
  '/bank-file',
  authorize('payroll:read'),
  validate(payrollReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const file = await payrollService.generateBankFile(
      parseInt(month as string),
      parseInt(year as string)
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  })
);

/**
 * GET /api/v1/payroll/employee/:employeeId
 * Get employee's payrolls
 */
router.get(
  '/employee/:employeeId',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const { year } = req.query;
    const payrolls = await payrollService.getEmployeePayrolls(
      req.params.employeeId,
      year ? parseInt(year as string) : undefined
    );
    return sendSuccess(res, payrolls);
  })
);

/**
 * GET /api/v1/payroll/preview/:employeeId
 * Preview payroll calculation for an employee
 */
router.get(
  '/preview/:employeeId',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const preview = await payrollService.calculatePayroll(
      req.params.employeeId,
      parseInt(month as string) || new Date().getMonth() + 1,
      parseInt(year as string) || new Date().getFullYear()
    );
    return sendSuccess(res, preview);
  })
);

/**
 * GET /api/v1/payroll/:id
 * Get a specific payroll
 */
router.get(
  '/:id',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const payroll = await payrollService.getPayrollById(req.params.id);
    return sendSuccess(res, payroll);
  })
);

/**
 * GET /api/v1/payrolls/:id/payslip
 * Get payslip for a payroll (same as getting payroll details)
 */
router.get(
  '/:id/payslip',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const payroll = await payrollService.getPayrollById(req.params.id);
    return sendSuccess(res, payroll);
  })
);

/**
 * POST /api/v1/payrolls/:id/approve
 * Approve a payroll
 */
router.post(
  '/:id/approve',
  authorize('payroll:approve'),
  asyncHandler(async (req, res) => {
    const payroll = await payrollService.approvePayroll(req.params.id, req.user!.userId);
    return sendSuccess(res, payroll, 'Payroll approved');
  })
);

/**
 * POST /api/v1/payrolls/:id/mark-paid
 * Mark a payroll as paid
 */
router.post(
  '/:id/mark-paid',
  authorize('payroll:update'),
  asyncHandler(async (req, res) => {
    const payroll = await payrollService.markAsPaid(req.params.id, req.user!.userId);
    return sendSuccess(res, payroll, 'Payroll marked as paid');
  })
);

/**
 * POST /api/v1/payroll/bulk-mark-paid
 * Bulk mark payrolls as paid
 */
router.post(
  '/bulk-mark-paid',
  authorize('payroll:update'),
  validate(bulkMarkPaidSchema),
  asyncHandler(async (req, res) => {
    const { payrollIds } = req.body;
    const result = await payrollService.bulkMarkAsPaid(payrollIds, req.user!.userId);
    return sendSuccess(res, result, 'Payrolls marked as paid');
  })
);

export default router;
