import { z } from 'zod';

export const registrationPeriodTypeEnum = z.enum(['REGULAR', 'LATE', 'DROP_ADD']);

export const createRegistrationPeriodSchema = z.object({
  semesterId: z.string().min(1, 'Semester ID is required'),
  type: registrationPeriodTypeEnum,
  startDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
  lateFee: z.number().min(0).optional(),
});

export const updateRegistrationPeriodSchema = z.object({
  type: registrationPeriodTypeEnum.optional(),
  startDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)).optional(),
  endDate: z.string().datetime().or(z.date()).transform((val) => new Date(val)).optional(),
  lateFee: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const registrationPeriodQuerySchema = z.object({
  semesterId: z.string().optional(),
  type: registrationPeriodTypeEnum.optional(),
  isActive: z.string().transform((v) => v === 'true').optional(),
});
