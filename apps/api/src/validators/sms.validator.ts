import { z } from 'zod';

// SMS Template enum
const smsTemplateEnum = z.enum([
  'otp',
  'payment-received',
  'payment-reminder',
  'book-overdue',
  'leave-approved',
  'leave-rejected',
  'grade-published',
  'class-cancelled',
  'fee-due',
  'registration-reminder',
  'custom',
]);

// OTP Purpose enum
const otpPurposeEnum = z.enum([
  'LOGIN',
  'PASSWORD_RESET',
  'VERIFY_PHONE',
  'VERIFY_EMAIL',
  'PAYMENT',
]);

// SMS Status enum
const smsStatusEnum = z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED']);

// Phone number validation - Somalia format
const phoneSchema = z.string().min(9).max(15).refine(
  (val) => {
    const normalized = val.replace(/[^\d+]/g, '');
    // Accept Somalia numbers or international format
    return /^(\+252[67]\d{8}|0[67]\d{7}|[67]\d{8}|\+\d{10,15})$/.test(normalized);
  },
  'Invalid phone number format'
);

// Send single SMS
export const sendSMSSchema = z.object({
  to: phoneSchema,
  message: z.string().min(1).max(480), // Max 3 SMS concatenated
  template: smsTemplateEnum.optional(),
  data: z.record(z.any()).optional(),
});

// Send bulk SMS
export const sendBulkSMSSchema = z.object({
  recipients: z.array(phoneSchema).min(1).max(1000),
  message: z.string().min(1).max(480),
  template: smsTemplateEnum.optional(),
  data: z.record(z.any()).optional(),
});

// Send OTP
export const sendOTPSchema = z.object({
  phone: phoneSchema,
  purpose: otpPurposeEnum,
});

// Verify OTP
export const verifyOTPSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: otpPurposeEnum,
});

// SMS logs query
export const smsLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: smsStatusEnum.optional(),
  phone: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Payment method enum
const paymentMethodEnum = z.enum([
  'EVC_PLUS',
  'ZAAD',
  'SAHAL',
  'BANK_TRANSFER',
  'CARD',
  'CASH',
  'MOBILE_MONEY',
]);

// Payment status enum
const paymentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
]);

// Create payment session
export const createPaymentSessionSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  amount: z.number().positive('Amount must be positive'),
  invoiceId: z.string().uuid().optional(),
  currency: z.string().length(3).default('USD'),
});

// Initiate payment
export const initiatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  method: paymentMethodEnum,
  studentId: z.string().uuid('Invalid student ID'),
  invoiceId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

// Mobile money payment
export const mobileMoneyPaymentSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  phone: phoneSchema,
  provider: z.enum(['EVC_PLUS', 'ZAAD', 'SAHAL']),
});

// Webhook payload
export const webhookPayloadSchema = z.object({
  transactionId: z.string(),
  status: z.string(),
  amount: z.number().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
  signature: z.string().optional(),
});

// Transaction query
export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: paymentStatusEnum.optional(),
  method: paymentMethodEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
