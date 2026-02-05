import { z } from 'zod';

export const enrollmentStatusEnum = z.enum([
  'REGISTERED',
  'DROPPED',
  'COMPLETED',
  'FAILED',
]);

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
  overridePrerequisites: z.boolean().optional(),
  overrideReason: z.string().max(500).optional(),
}).refine(
  (data) => !data.overridePrerequisites || data.overrideReason,
  {
    message: 'Override reason is required when overriding prerequisites',
    path: ['overrideReason'],
  }
);

export const dropStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
  reason: z.string().max(500).optional(),
});

export const bulkEnrollSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  studentIds: z.array(z.string().uuid()).min(1, 'At least one student ID is required'),
});

export const enrollmentQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  semesterId: z.string().optional(),
  status: enrollmentStatusEnum.optional(),
});

export const prerequisiteCheckSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  courseId: z.string().uuid('Invalid course ID'),
});

export const scheduleConflictCheckSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
});
