import { z } from 'zod';

// ===========================================
// Leave Type Validators
// ===========================================

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameLocal: z.string().optional(),
  type: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPASSIONATE']),
  daysPerYear: z.number().int().min(1, 'Days per year must be at least 1'),
  carryForward: z.boolean().optional().default(false),
  maxCarryDays: z.number().int().min(0).optional().default(0),
  requiresDocument: z.boolean().optional().default(false),
  isPaid: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().min(1).optional(),
  nameLocal: z.string().optional(),
  daysPerYear: z.number().int().min(1).optional(),
  carryForward: z.boolean().optional(),
  maxCarryDays: z.number().int().min(0).optional(),
  requiresDocument: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ===========================================
// Leave Balance Validators
// ===========================================

export const allocateLeaveSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  leaveTypeId: z.string().uuid('Invalid leave type ID'),
  year: z.number().int().min(2000).max(2100),
  days: z.number().int().min(0),
});

export const carryForwardSchema = z.object({
  year: z.number().int().min(2000).max(2100),
});

export const leaveBalanceQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
});

// ===========================================
// Leave Request Validators
// ===========================================

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  leaveTypeId: z.string().uuid('Invalid leave type ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(1, 'Reason is required'),
  documentUrl: z.string().url().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});

export const approveRejectLeaveSchema = z.object({
  remarks: z.string().optional(),
});

export const leaveRequestQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const leaveCalendarQuerySchema = z.object({
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Invalid month'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year'),
  departmentId: z.string().uuid().optional(),
});

// ===========================================
// Salary Component Validators
// ===========================================

export const createSalaryComponentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['ALLOWANCE', 'DEDUCTION']),
  calculationType: z.enum(['FIXED', 'PERCENTAGE']),
  defaultValue: z.number().min(0),
  isActive: z.boolean().optional().default(true),
  appliesToAll: z.boolean().optional().default(false),
  description: z.string().optional(),
});

export const updateSalaryComponentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['ALLOWANCE', 'DEDUCTION']).optional(),
  calculationType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  defaultValue: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  appliesToAll: z.boolean().optional(),
  description: z.string().optional(),
});

export const assignComponentSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  value: z.number().min(0).optional(),
});

// ===========================================
// Payroll Validators
// ===========================================

export const processPayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  departmentId: z.string().uuid().optional(),
});

export const payrollQuerySchema = z.object({
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  status: z.enum(['DRAFT', 'PROCESSED', 'APPROVED', 'PAID']).optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const bulkMarkPaidSchema = z.object({
  payrollIds: z.array(z.string().uuid()).min(1, 'At least one payroll ID is required'),
});

export const payrollReportQuerySchema = z.object({
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Invalid month'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year'),
});

// ===========================================
// Employee Self-Service Validators
// ===========================================

export const employeeLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid('Invalid leave type ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(1, 'Reason is required'),
  documentUrl: z.string().url().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});
