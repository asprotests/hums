import { z } from 'zod';

export const employeeAttendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
]);

export const manualEntrySchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  checkIn: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid check-in time format',
  }),
  checkOut: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid check-out time format',
  }),
  status: employeeAttendanceStatusEnum.optional(),
  remarks: z.string().max(500).optional(),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
  message: 'Check-out time must be after check-in time',
  path: ['checkOut'],
});

export const employeeAttendanceQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export const dailyAttendanceQuerySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  departmentId: z.string().uuid().optional(),
});

export const reportQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export const lateArrivalsQuerySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  graceMinutes: z.coerce.number().min(0).max(60).optional(),
});

export const absenteesQuerySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  departmentId: z.string().uuid().optional(),
});

export const markOnLeaveSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  remarks: z.string().max(500).optional(),
});

export const markHolidaySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  departmentId: z.string().uuid().optional(),
  remarks: z.string().max(500).optional(),
});
