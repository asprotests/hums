import { z } from 'zod';

export const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  status: attendanceStatusEnum,
  remarks: z.string().max(500).optional(),
});

export const markAttendanceSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  records: z.array(attendanceRecordSchema).min(1, 'At least one record is required'),
});

export const markSingleAttendanceSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  studentId: z.string().uuid('Invalid student ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  status: attendanceStatusEnum,
  remarks: z.string().max(500).optional(),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum,
  remarks: z.string().max(500).optional(),
});

export const getClassAttendanceSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
});

export const attendanceQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  semesterId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: attendanceStatusEnum.optional(),
});

export const submitExcuseSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  documentUrl: z.string().url().optional(),
});

export const reviewExcuseSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const rejectExcuseSchema = z.object({
  remarks: z.string().min(5, 'Rejection reason is required').max(500),
});

export const belowThresholdQuerySchema = z.object({
  threshold: z.coerce.number().min(0).max(100).optional().default(75),
});
