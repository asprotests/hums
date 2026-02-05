import { z } from 'zod';

// ============= Grade Scale Validators =============

export const gradeDefinitionSchema = z.object({
  letter: z.string().min(1).max(3),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  gradePoints: z.number().min(0).max(4),
  description: z.string().optional(),
});

export const createGradeScaleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  isDefault: z.boolean().optional(),
  grades: z.array(gradeDefinitionSchema).min(1, 'At least one grade definition is required'),
});

export const updateGradeScaleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  grades: z.array(gradeDefinitionSchema).min(1).optional(),
});

// ============= Grade Component Validators =============

export const gradeComponentTypeEnum = z.enum([
  'MIDTERM',
  'FINAL',
  'QUIZ',
  'ASSIGNMENT',
  'PROJECT',
  'PARTICIPATION',
  'LAB',
  'OTHER',
]);

export const createGradeComponentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: gradeComponentTypeEnum,
  weight: z.number().min(0).max(100),
  maxScore: z.number().positive('Max score must be positive'),
  dueDate: z.coerce.date().optional(),
});

export const updateGradeComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: gradeComponentTypeEnum.optional(),
  weight: z.number().min(0).max(100).optional(),
  maxScore: z.number().positive().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const copyComponentsSchema = z.object({
  sourceClassId: z.string().uuid('Invalid source class ID'),
  targetClassId: z.string().uuid('Invalid target class ID'),
});

// ============= Grade Entry Validators =============

export const gradeEntryInputSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  score: z.number().min(0, 'Score cannot be negative'),
  remarks: z.string().optional(),
});

export const enterGradesSchema = z.object({
  grades: z.array(gradeEntryInputSchema).min(1, 'At least one grade entry is required'),
});

export const updateGradeEntrySchema = z.object({
  score: z.number().min(0, 'Score cannot be negative'),
  remarks: z.string().optional(),
});

// ============= Exam Validators =============

export const examTypeEnum = z.enum(['MIDTERM', 'FINAL', 'QUIZ', 'MAKEUP']);
export const examStatusEnum = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const createExamSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  type: examTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'),
  duration: z.number().int().positive('Duration must be a positive integer (minutes)'),
  roomId: z.string().uuid('Invalid room ID'),
  maxScore: z.number().positive('Max score must be positive'),
  instructions: z.string().optional(),
});

export const updateExamSchema = z.object({
  type: examTypeEnum.optional(),
  title: z.string().min(1).max(200).optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  duration: z.number().int().positive().optional(),
  roomId: z.string().uuid().optional(),
  maxScore: z.number().positive().optional(),
  instructions: z.string().nullable().optional(),
  status: examStatusEnum.optional(),
});

export const examQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  classId: z.string().optional(),
  semesterId: z.string().optional(),
  type: examTypeEnum.optional(),
  status: examStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const cancelExamSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

// ============= Grade Calculation Validators =============

export const finalizeGradesSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm grade finalization' }),
  }),
});

export const unfinalizeGradesSchema = z.object({
  reason: z.string().min(1, 'Reason for unfinalizing is required'),
});

// ============= Type Exports =============

export type CreateGradeScaleInput = z.infer<typeof createGradeScaleSchema>;
export type UpdateGradeScaleInput = z.infer<typeof updateGradeScaleSchema>;
export type CreateGradeComponentInput = z.infer<typeof createGradeComponentSchema>;
export type UpdateGradeComponentInput = z.infer<typeof updateGradeComponentSchema>;
export type CopyComponentsInput = z.infer<typeof copyComponentsSchema>;
export type GradeEntryInput = z.infer<typeof gradeEntryInputSchema>;
export type EnterGradesInput = z.infer<typeof enterGradesSchema>;
export type UpdateGradeEntryInput = z.infer<typeof updateGradeEntrySchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type ExamQueryInput = z.infer<typeof examQuerySchema>;
