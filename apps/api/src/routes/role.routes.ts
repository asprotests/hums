import { Router, type Router as RouterType } from 'express';
import { roleService } from '../services/role.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private (roles:read)
 */
router.get(
  '/',
  authorize('roles:read'),
  asyncHandler(async (_req, res) => {
    const roles = await roleService.getRoles();
    return sendSuccess(res, roles);
  })
);

/**
 * @route   GET /api/v1/permissions
 * @desc    Get all available permissions
 * @access  Private (roles:read)
 */
router.get(
  '/permissions',
  authorize('roles:read'),
  asyncHandler(async (_req, res) => {
    const permissions = await roleService.getPermissions();
    return sendSuccess(res, permissions);
  })
);

/**
 * @route   POST /api/v1/roles
 * @desc    Create a new role
 * @access  Private (roles:create)
 */
router.post(
  '/',
  authorize('roles:create'),
  validate(createRoleSchema),
  asyncHandler(async (req, res) => {
    const role = await roleService.createRole(req.body, req.user?.userId);
    return sendCreated(res, role, 'Role created successfully');
  })
);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get role by ID
 * @access  Private (roles:read)
 */
router.get(
  '/:id',
  authorize('roles:read'),
  asyncHandler(async (req, res) => {
    const role = await roleService.getRoleById(req.params.id);
    return sendSuccess(res, role);
  })
);

/**
 * @route   PATCH /api/v1/roles/:id
 * @desc    Update role
 * @access  Private (roles:update)
 */
router.patch(
  '/:id',
  authorize('roles:update'),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const role = await roleService.updateRole(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, role, 'Role updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    Delete role
 * @access  Private (roles:delete)
 */
router.delete(
  '/:id',
  authorize('roles:delete'),
  asyncHandler(async (req, res) => {
    const result = await roleService.deleteRole(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

export default router;
