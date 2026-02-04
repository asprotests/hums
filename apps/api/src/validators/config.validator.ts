import { z } from 'zod';

// Grade scale item schema
export const gradeScaleItemSchema = z.object({
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  letterGrade: z.string().min(1).max(5),
  gradePoints: z.number().min(0).max(5),
});

// System config schema
export const systemConfigSchema = z.object({
  // Branding
  universityName: z.string().min(1).max(200).optional(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),

  // Localization
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),

  // Academic
  minAttendancePercentage: z.number().min(0).max(100).optional(),
  gradeScale: z.array(gradeScaleItemSchema).optional(),

  // Security
  sessionTimeoutMinutes: z.number().min(5).max(1440).optional(),
  maxLoginAttempts: z.number().min(1).max(10).optional(),
  passwordExpiryDays: z.number().min(0).max(365).optional(),
});

// Type exports
export type GradeScaleItem = z.infer<typeof gradeScaleItemSchema>;
export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
