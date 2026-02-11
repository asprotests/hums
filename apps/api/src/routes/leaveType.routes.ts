import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { leaveTypeService } from '../services/leaveType.service.js';
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
} from '../validators/leavePayroll.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/leave-types
 * Get all leave types
 */
router.get(
  '/',
  authorize('leave:read'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const leaveTypes = await leaveTypeService.getLeaveTypes(includeInactive);
    return sendSuccess(res, leaveTypes);
  })
);

/**
 * GET /api/v1/leave-types/:id
 * Get leave type by ID
 */
router.get(
  '/:id',
  authorize('leave:read'),
  asyncHandler(async (req, res) => {
    const leaveType = await leaveTypeService.getLeaveTypeById(req.params.id);
    return sendSuccess(res, leaveType);
  })
);

/**
 * POST /api/v1/leave-types
 * Create a new leave type
 */
router.post(
  '/',
  authorize('leave:create'),
  validate(createLeaveTypeSchema),
  asyncHandler(async (req, res) => {
    const leaveType = await leaveTypeService.createLeaveType(req.body, req.user!.userId);
    return sendCreated(res, leaveType);
  })
);

/**
 * PATCH /api/v1/leave-types/:id
 * Update a leave type
 */
router.patch(
  '/:id',
  authorize('leave:update'),
  validate(updateLeaveTypeSchema),
  asyncHandler(async (req, res) => {
    const leaveType = await leaveTypeService.updateLeaveType(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, leaveType);
  })
);

/**
 * POST /api/v1/leave-types/initialize
 * Initialize default leave types
 */
router.post(
  '/initialize',
  authorize('leave:create'),
  asyncHandler(async (req, res) => {
    await leaveTypeService.initializeDefaultTypes(req.user!.userId);
    return sendSuccess(res, null, 'Default leave types initialized');
  })
);

export default router;
