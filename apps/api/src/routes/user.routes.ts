import { Router, type Router as RouterType } from 'express';
import { userService } from '../services/user.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  bulkImportSchema,
} from '../validators/user.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filters
 * @access  Private (users:read)
 */
router.get(
  '/',
  authorize('users:read'),
  validate(userQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await userService.getUsers(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private (users:create)
 */
router.post(
  '/',
  authorize('users:create'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body, req.user?.userId);
    return sendCreated(res, user, 'User created successfully');
  })
);

/**
 * @route   POST /api/v1/users/bulk-import
 * @desc    Bulk import users from CSV data
 * @access  Private (users:create)
 */
router.post(
  '/bulk-import',
  authorize('users:create'),
  validate(bulkImportSchema),
  asyncHandler(async (req, res) => {
    const result = await userService.bulkImportUsers(req.body.users, req.user?.userId);
    return sendSuccess(res, result, `Import completed: ${result.success} success, ${result.failed} failed`);
  })
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (users:read)
 */
router.get(
  '/:id',
  authorize('users:read'),
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, user);
  })
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Private (users:update)
 */
router.patch(
  '/:id',
  authorize('users:update'),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, user, 'User updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (users:delete)
 */
router.delete(
  '/:id',
  authorize('users:delete'),
  asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   PATCH /api/v1/users/:id/activate
 * @desc    Activate user
 * @access  Private (users:update)
 */
router.patch(
  '/:id/activate',
  authorize('users:update'),
  asyncHandler(async (req, res) => {
    const result = await userService.activateUser(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   PATCH /api/v1/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (users:update)
 */
router.patch(
  '/:id/deactivate',
  authorize('users:update'),
  asyncHandler(async (req, res) => {
    const result = await userService.deactivateUser(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/users/:id/activity
 * @desc    Get user activity/audit logs
 * @access  Private (users:read, audit:read)
 */
router.get(
  '/:id/activity',
  authorize('users:read', 'audit:read'),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getUserActivity(req.params.id, page, limit);
    return sendPaginated(res, result.data, result.pagination);
  })
);

export default router;
