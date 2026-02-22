import { z } from 'zod';

// ==================== Two-Factor Authentication ====================

export const setupTOTPSchema = z.object({
  // No body params needed - uses authenticated user
});

export const verifyTOTPSetupSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const sendOTPSchema = z.object({
  method: z.enum(['SMS', 'EMAIL'], {
    required_error: 'Method is required',
    invalid_type_error: 'Method must be SMS or EMAIL',
  }),
});

export const verifyOTPSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const verify2FASchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code must be at most 10 characters'), // Allows TOTP (6) or backup codes (8-9 with dash)
});

export const enable2FASchema = z.object({
  method: z.enum(['TOTP', 'SMS', 'EMAIL'], {
    required_error: 'Method is required',
    invalid_type_error: 'Method must be TOTP, SMS, or EMAIL',
  }),
});

export const disable2FASchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code must be at most 10 characters'),
});

export const regenerateBackupCodesSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code must be at most 10 characters'),
});

export const adminReset2FASchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// ==================== Notification Preferences ====================

export const updatePreferencesSchema = z.object({
  // Email preferences
  emailEnabled: z.boolean().optional(),
  emailAcademic: z.boolean().optional(),
  emailFinance: z.boolean().optional(),
  emailLibrary: z.boolean().optional(),
  emailAnnouncements: z.boolean().optional(),
  emailSystem: z.boolean().optional(),
  // SMS preferences
  smsEnabled: z.boolean().optional(),
  smsUrgent: z.boolean().optional(),
  smsPayments: z.boolean().optional(),
  smsOtp: z.boolean().optional(),
  // Push preferences
  pushEnabled: z.boolean().optional(),
  pushAcademic: z.boolean().optional(),
  pushFinance: z.boolean().optional(),
  pushLibrary: z.boolean().optional(),
  pushAnnouncements: z.boolean().optional(),
  // In-app preferences
  inAppSound: z.boolean().optional(),
  inAppDesktop: z.boolean().optional(),
});

export const sendNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ACADEMIC', 'FINANCE', 'LIBRARY', 'HR', 'SYSTEM']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  link: z.string().url().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  data: z.record(z.unknown()).optional(),
});

export const sendBulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ACADEMIC', 'FINANCE', 'LIBRARY', 'HR', 'SYSTEM']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

export const getNotificationHistorySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  unreadOnly: z.coerce.boolean().optional(),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ACADEMIC', 'FINANCE', 'LIBRARY', 'HR', 'SYSTEM']).optional(),
});

export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
});

// Export types
export type VerifyTOTPSetupInput = z.infer<typeof verifyTOTPSetupSchema>;
export type SendOTPInput = z.infer<typeof sendOTPSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type SendBulkNotificationInput = z.infer<typeof sendBulkNotificationSchema>;
export type GetNotificationHistoryInput = z.infer<typeof getNotificationHistorySchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
