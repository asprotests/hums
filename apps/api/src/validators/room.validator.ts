import { z } from 'zod';

export const roomTypeEnum = z.enum(['CLASSROOM', 'LAB', 'AUDITORIUM', 'SEMINAR_ROOM']);

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  building: z.string().max(100).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000),
  roomType: roomTypeEnum.optional().default('CLASSROOM'),
  facilities: z.array(z.string()).optional().default([]),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  building: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(1).max(1000).optional(),
  roomType: roomTypeEnum.optional(),
  facilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const roomQuerySchema = z.object({
  building: z.string().optional(),
  roomType: roomTypeEnum.optional(),
  minCapacity: z.string().transform(Number).optional(),
  isActive: z.string().transform((v) => v === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const checkAvailabilitySchema = z.object({
  day: z.string().transform(Number).refine((v) => v >= 0 && v <= 6, 'Day must be 0-6'),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM format'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM format'),
});
