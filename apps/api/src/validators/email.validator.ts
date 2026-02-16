import { z } from 'zod';

// Email templates enum
const emailTemplateEnum = z.enum([
  'welcome',
  'password-reset',
  'password-changed',
  'application-received',
  'application-approved',
  'application-rejected',
  'enrollment-confirmed',
  'grades-published',
  'attendance-warning',
  'invoice-generated',
  'payment-received',
  'payment-reminder',
  'payment-overdue',
  'leave-request-submitted',
  'leave-approved',
  'leave-rejected',
  'payslip-ready',
  'contract-expiring',
  'book-due-reminder',
  'book-overdue',
  'reservation-ready',
  'announcement',
  'custom',
]);

// Send email schema
export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1, 'Subject is required'),
  template: emailTemplateEnum.optional(),
  data: z.record(z.any()).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
}).refine(
  (data) => data.template || data.html || data.text,
  { message: 'Either template or html/text content is required' }
);

// Send bulk emails schema
export const sendBulkEmailsSchema = z.object({
  emails: z.array(sendEmailSchema).min(1, 'At least one email is required'),
});

// Schedule email schema (base without refine, then add scheduledAt)
export const scheduleEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1, 'Subject is required'),
  template: emailTemplateEnum.optional(),
  data: z.record(z.any()).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
  scheduledAt: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'Scheduled time must be in the future' }
  ),
}).refine(
  (data) => data.template || data.html || data.text,
  { message: 'Either template or html/text content is required' }
);

// Update template schema
export const updateTemplateSchema = z.object({
  subject: z.string().min(1).optional(),
  subjectLocal: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  bodyHtmlLocal: z.string().optional(),
  bodyTextLocal: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Test email schema
export const testEmailSchema = z.object({
  to: z.string().email('Valid email required'),
  template: emailTemplateEnum.optional(),
});

// Preview template schema
export const previewTemplateSchema = z.object({
  data: z.record(z.any()).optional(),
});

// Email log query schema
export const emailLogQuerySchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'BOUNCED']).optional(),
  template: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Notification type enum
const notificationTypeEnum = z.enum([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'ACADEMIC',
  'FINANCE',
  'LIBRARY',
  'HR',
  'SYSTEM',
]);

// Link validation - accepts both full URLs and relative paths
const linkSchema = z.string().refine(
  (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
  'Link must be a URL or relative path starting with /'
).optional();

// Create notification schema
export const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: notificationTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  data: z.record(z.any()).optional(),
  link: linkSchema,
});

// Bulk notification schema
export const bulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  type: notificationTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  data: z.record(z.any()).optional(),
  link: linkSchema,
});

// Role notification schema
export const roleNotificationSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  type: notificationTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  data: z.record(z.any()).optional(),
  link: linkSchema,
});

// Notification query schema
export const notificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  type: notificationTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
