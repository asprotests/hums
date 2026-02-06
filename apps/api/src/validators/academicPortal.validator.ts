import { z } from 'zod';

// ============= Material Type Enum =============

export const materialTypeEnum = z.enum([
  'DOCUMENT',
  'VIDEO',
  'LINK',
  'SLIDES',
  'SYLLABUS',
  'ASSIGNMENT',
  'OTHER',
]);

// ============= Course Material Validators =============

export const createMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  type: materialTypeEnum,
  fileUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  week: z.number().int().min(1).max(20).optional(),
  isPublished: z.boolean().optional(),
}).refine(
  (data) => data.fileUrl || data.externalUrl,
  { message: 'Either fileUrl or externalUrl must be provided' }
);

export const updateMaterialSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  type: materialTypeEnum.optional(),
  fileUrl: z.string().url().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  week: z.number().int().min(1).max(20).nullable().optional(),
});

export const reorderMaterialsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one material ID is required'),
});

// ============= Dashboard Query Validators =============

export const dashboardQuerySchema = z.object({
  semesterId: z.string().uuid().optional(),
});

export const scheduleQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

// ============= HOD Validators =============

export const assignLecturerSchema = z.object({
  lecturerId: z.string().uuid('Invalid lecturer ID'),
});

// ============= Report Query Validators =============

export const reportQuerySchema = z.object({
  semesterId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const attendanceReportQuerySchema = z.object({
  semesterId: z.string().uuid().optional(),
  threshold: z.coerce.number().min(0).max(100).default(75),
});

// ============= Material Query Validators =============

export const materialQuerySchema = z.object({
  week: z.coerce.number().int().min(1).max(20).optional(),
  type: materialTypeEnum.optional(),
  includeUnpublished: z.coerce.boolean().default(false),
});

// ============= Type Exports =============

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type ReorderMaterialsInput = z.infer<typeof reorderMaterialsSchema>;
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
export type ScheduleQueryInput = z.infer<typeof scheduleQuerySchema>;
export type AssignLecturerInput = z.infer<typeof assignLecturerSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type MaterialQueryInput = z.infer<typeof materialQuerySchema>;
