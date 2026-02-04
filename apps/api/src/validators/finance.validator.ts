import { z } from 'zod';

// =============================================
// Fee Structure Validators
// =============================================

export const createFeeStructureSchema = z.object({
  programId: z.string().uuid('Invalid program ID'),
  academicYear: z.string().min(1, 'Academic year is required'),
  tuitionFee: z.number().positive('Tuition fee must be positive'),
  registrationFee: z.number().min(0, 'Registration fee cannot be negative'),
  libraryFee: z.number().min(0, 'Library fee cannot be negative'),
  labFee: z.number().min(0, 'Lab fee cannot be negative').optional(),
  otherFees: z
    .array(
      z.object({
        name: z.string().min(1, 'Fee name is required'),
        amount: z.number().min(0, 'Amount cannot be negative'),
      })
    )
    .optional(),
});

export const updateFeeStructureSchema = z.object({
  tuitionFee: z.number().positive('Tuition fee must be positive').optional(),
  registrationFee: z.number().min(0, 'Registration fee cannot be negative').optional(),
  libraryFee: z.number().min(0, 'Library fee cannot be negative').optional(),
  labFee: z.number().min(0, 'Lab fee cannot be negative').optional(),
  otherFees: z
    .array(
      z.object({
        name: z.string().min(1, 'Fee name is required'),
        amount: z.number().min(0, 'Amount cannot be negative'),
      })
    )
    .optional(),
});

export const feeStructureQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  academicYear: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// =============================================
// Invoice Validators
// =============================================

export const generateInvoiceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  semesterId: z.string().min(1, 'Semester ID is required'),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

export const generateBulkInvoicesSchema = z.object({
  semesterId: z.string().min(1, 'Semester ID is required'),
  programId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  semesterId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// =============================================
// Payment Validators
// =============================================

export const recordPaymentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'EVC_PLUS']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'EVC_PLUS']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// =============================================
// Report Validators
// =============================================

export const collectionReportSchema = z.object({
  from: z.string().min(1, 'From date is required'),
  to: z.string().min(1, 'To date is required'),
});

export const dailySummarySchema = z.object({
  date: z.string().optional(),
});

// =============================================
// Type Exports
// =============================================

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;
export type FeeStructureQueryInput = z.infer<typeof feeStructureQuerySchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type GenerateBulkInvoicesInput = z.infer<typeof generateBulkInvoicesSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
export type CollectionReportInput = z.infer<typeof collectionReportSchema>;
export type DailySummaryInput = z.infer<typeof dailySummarySchema>;
