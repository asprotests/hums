import { z } from 'zod';

export const scheduleTypeEnum = z.enum(['LECTURE', 'LAB', 'TUTORIAL', 'EXAM']);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createScheduleSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  dayOfWeek: z.number().int().min(0, 'Day must be 0-6').max(6, 'Day must be 0-6'),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format (24-hour)'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:MM format (24-hour)'),
  roomId: z.string().uuid('Invalid room ID').optional(),
  scheduleType: scheduleTypeEnum.optional().default('LECTURE'),
});

export const updateScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format (24-hour)').optional(),
  endTime: z.string().regex(timeRegex, 'End time must be HH:MM format (24-hour)').optional(),
  roomId: z.string().uuid('Invalid room ID').optional().nullable(),
  scheduleType: scheduleTypeEnum.optional(),
});

export const scheduleQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  dayOfWeek: z.string().transform(Number).optional(),
  semesterId: z.string().optional(),
  lecturerId: z.string().uuid().optional(),
});

export const bulkScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format (24-hour)'),
      endTime: z.string().regex(timeRegex, 'End time must be HH:MM format (24-hour)'),
      roomId: z.string().uuid('Invalid room ID').optional(),
      scheduleType: scheduleTypeEnum.optional().default('LECTURE'),
    })
  ).min(1, 'At least one schedule is required'),
});

export const copySchedulesSchema = z.object({
  targetClassId: z.string().uuid('Invalid target class ID'),
});
