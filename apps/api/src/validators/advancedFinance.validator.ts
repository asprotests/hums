import { z } from 'zod';

// =====================
// Scholarship Validators
// =====================

export const scholarshipTypeSchema = z.enum([
  'MERIT',
  'NEED_BASED',
  'ATHLETIC',
  'FULL',
  'PARTIAL',
  'EXTERNAL',
]);

export const scholarshipCriteriaSchema = z.object({
  minGPA: z.number().min(0).max(4).optional(),
  maxIncome: z.number().positive().optional(),
  programs: z.array(z.string().uuid()).optional(),
  yearOfStudy: z.array(z.number().int().min(1).max(10)).optional(),
}).optional();

export const createScholarshipSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: scholarshipTypeSchema,
  amount: z.number().positive(),
  amountType: z.enum(['FIXED', 'PERCENTAGE']),
  criteria: scholarshipCriteriaSchema,
  maxRecipients: z.number().int().positive().optional(),
  academicYearId: z.string().uuid().optional(),
  applicationDeadline: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const updateScholarshipSchema = createScholarshipSchema.partial();

export const scholarshipQuerySchema = z.object({
  type: scholarshipTypeSchema.optional(),
  academicYearId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const awardScholarshipSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().max(1000).optional(),
});

export const applyAwardToInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const revokeAwardSchema = z.object({
  reason: z.string().min(1).max(500),
});

// =====================
// Fee Waiver Validators
// =====================

export const waiverTypeSchema = z.enum([
  'SIBLING_DISCOUNT',
  'STAFF_DEPENDENT',
  'FINANCIAL_HARDSHIP',
  'ACADEMIC_EXCELLENCE',
  'OTHER',
]);

export const createFeeWaiverSchema = z.object({
  studentId: z.string().uuid(),
  type: waiverTypeSchema,
  amount: z.number().positive(),
  amountType: z.enum(['FIXED', 'PERCENTAGE']),
  reason: z.string().min(1).max(2000),
  supportingDocs: z.array(z.string()).optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
});

export const feeWaiverQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  type: waiverTypeSchema.optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'APPLIED']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const rejectWaiverSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const applyWaiverToInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

// =====================
// Payment Plan Validators
// =====================

export const createPaymentPlanSchema = z.object({
  studentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  downPayment: z.number().positive(),
  numberOfInstallments: z.number().int().min(2).max(12),
  startDate: z.string().datetime(),
  lateFeePercentage: z.number().min(0).max(100).optional(),
});

export const paymentPlanQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const payInstallmentSchema = z.object({
  amount: z.number().positive(),
  paymentId: z.string().uuid(),
});

// =====================
// Refund Validators
// =====================

export const refundReasonSchema = z.enum([
  'WITHDRAWAL',
  'OVERPAYMENT',
  'COURSE_CANCELLATION',
  'FEE_ADJUSTMENT',
  'OTHER',
]);

export const createRefundSchema = z.object({
  studentId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: refundReasonSchema,
  description: z.string().max(2000).optional(),
});

export const refundQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED']).optional(),
  reason: refundReasonSchema.optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const rejectRefundSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const processRefundSchema = z.object({
  refundMethod: z.string().min(1).max(100),
  refundReference: z.string().min(1).max(255),
});

// =====================
// Budget Validators
// =====================

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  departmentId: z.string().uuid().optional(),
  fiscalYear: z.string().regex(/^\d{4}-\d{4}$/, 'Fiscal year must be in format YYYY-YYYY'),
  totalAmount: z.number().positive(),
  notes: z.string().max(2000).optional(),
  categories: z.array(z.object({
    name: z.string().min(1).max(100),
    allocatedAmount: z.number().positive(),
  })).optional(),
});

export const updateBudgetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  totalAmount: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  notes: z.string().max(2000).optional(),
});

export const budgetQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  fiscalYear: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const allocateToCategorySchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  date: z.string().datetime().optional(),
  reference: z.string().max(100).optional(),
});

export const transferBetweenCategoriesSchema = z.object({
  fromCategoryId: z.string().uuid(),
  toCategoryId: z.string().uuid(),
  amount: z.number().positive(),
});

// Type exports
export type CreateScholarshipInput = z.infer<typeof createScholarshipSchema>;
export type UpdateScholarshipInput = z.infer<typeof updateScholarshipSchema>;
export type ScholarshipQueryInput = z.infer<typeof scholarshipQuerySchema>;
export type AwardScholarshipInput = z.infer<typeof awardScholarshipSchema>;

export type CreateFeeWaiverInput = z.infer<typeof createFeeWaiverSchema>;
export type FeeWaiverQueryInput = z.infer<typeof feeWaiverQuerySchema>;

export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>;
export type PaymentPlanQueryInput = z.infer<typeof paymentPlanQuerySchema>;

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type RefundQueryInput = z.infer<typeof refundQuerySchema>;

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>;
