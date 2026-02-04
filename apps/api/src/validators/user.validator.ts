import { z } from 'zod';

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Create user validation
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
});

// Update user validation
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  password: passwordSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  roleIds: z.array(z.string().uuid()).min(1).optional(),
});

// User query params validation
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

// Bulk import validation
export const bulkImportUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  password: z.string().optional(),
});

export const bulkImportSchema = z.object({
  users: z.array(bulkImportUserSchema).min(1, 'At least one user is required'),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
