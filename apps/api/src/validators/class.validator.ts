import { z } from 'zod';

export const classStatusEnum = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);

export const createClassSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  semesterId: z.string().min(1, 'Semester ID is required'),
  lecturerId: z.string().uuid('Invalid lecturer ID'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(500),
  name: z.string().min(1).max(50).optional(),
  roomId: z.string().uuid('Invalid room ID').optional(),
});

export const updateClassSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  lecturerId: z.string().uuid('Invalid lecturer ID').optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  roomId: z.string().uuid('Invalid room ID').optional().nullable(),
  status: classStatusEnum.optional(),
});

export const classQuerySchema = z.object({
  semesterId: z.string().optional(),
  courseId: z.string().uuid().optional(),
  lecturerId: z.string().uuid().optional(),
  status: classStatusEnum.optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const cancelClassSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export const assignLecturerSchema = z.object({
  lecturerId: z.string().uuid('Invalid lecturer ID'),
});

export const assignRoomSchema = z.object({
  roomId: z.string().uuid('Invalid room ID').nullable(),
});
