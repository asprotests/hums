import { z } from 'zod';

// Create role validation
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .regex(/^[a-zA-Z_]+$/, 'Role name can only contain letters and underscores'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

// Update role validation
export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .regex(/^[a-zA-Z_]+$/, 'Role name can only contain letters and underscores')
    .optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

// Type exports
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
