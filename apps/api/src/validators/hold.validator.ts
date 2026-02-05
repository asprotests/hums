import { z } from 'zod';

export const holdTypeEnum = z.enum([
  'FINANCIAL',
  'ACADEMIC',
  'LIBRARY',
  'DISCIPLINARY',
  'ADMINISTRATIVE',
]);

export const createHoldSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  type: holdTypeEnum,
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
  blocksRegistration: z.boolean().optional(),
  blocksGrades: z.boolean().optional(),
  blocksTranscript: z.boolean().optional(),
});

export const updateHoldSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  blocksRegistration: z.boolean().optional(),
  blocksGrades: z.boolean().optional(),
  blocksTranscript: z.boolean().optional(),
});

export const holdQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  type: holdTypeEnum.optional(),
  isActive: z.string().transform((v) => v === 'true').optional(),
});
