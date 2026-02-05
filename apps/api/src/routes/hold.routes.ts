import { Router, type Router as RouterType } from 'express';
import { holdService } from '../services/hold.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createHoldSchema,
  updateHoldSchema,
  holdQuerySchema,
} from '../validators/hold.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { AppError } from '../utils/AppError.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/holds
 * @desc Get all holds with filters
 * @access Private (holds:read)
 */
router.get(
  '/',
  authorize('holds:read'),
  validate(holdQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = req.query as {
      studentId?: string;
      type?: 'FINANCIAL' | 'ACADEMIC' | 'LIBRARY' | 'DISCIPLINARY' | 'ADMINISTRATIVE';
      isActive?: boolean;
    };

    const holds = await holdService.getHolds(filters);
    return sendSuccess(res, holds);
  })
);

/**
 * @route GET /api/v1/holds/student/:studentId
 * @desc Get all active holds for a student
 * @access Private (holds:read or own holds)
 */
router.get(
  '/student/:studentId',
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    // Check if user has permission to view holds
    // Admin/Registrar/Finance can view any student's holds
    // Student can only view their own holds
    const hasPermission = req.user?.permissions?.includes('holds:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to view these holds');
    }

    const holds = await holdService.getStudentActiveHolds(studentId);
    return sendSuccess(res, holds);
  })
);

/**
 * @route GET /api/v1/holds/student/:studentId/registration-check
 * @desc Check if student has registration holds
 * @access Private (holds:read or own check)
 */
router.get(
  '/student/:studentId/registration-check',
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    const hasPermission = req.user?.permissions?.includes('holds:read');
    const isOwnRecord = req.user?.studentId === studentId;

    if (!hasPermission && !isOwnRecord) {
      throw AppError.forbidden('Not authorized to perform this check');
    }

    const result = await holdService.hasRegistrationHold(studentId);
    return sendSuccess(res, result);
  })
);

/**
 * @route GET /api/v1/holds/:id
 * @desc Get hold by ID
 * @access Private (holds:read)
 */
router.get(
  '/:id',
  authorize('holds:read'),
  asyncHandler(async (req, res) => {
    const hold = await holdService.getHoldById(req.params.id);
    return sendSuccess(res, hold);
  })
);

/**
 * @route POST /api/v1/holds
 * @desc Place a hold on a student
 * @access Private (holds:create)
 */
router.post(
  '/',
  authorize('holds:create'),
  validate(createHoldSchema),
  asyncHandler(async (req, res) => {
    const hold = await holdService.createHold(req.body, req.user!.userId);
    return sendCreated(res, hold, 'Hold placed successfully');
  })
);

/**
 * @route PATCH /api/v1/holds/:id
 * @desc Update a hold
 * @access Private (holds:update)
 */
router.patch(
  '/:id',
  authorize('holds:update'),
  validate(updateHoldSchema),
  asyncHandler(async (req, res) => {
    const hold = await holdService.updateHold(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, hold, 'Hold updated successfully');
  })
);

/**
 * @route POST /api/v1/holds/:id/release
 * @desc Release a hold
 * @access Private (holds:delete)
 */
router.post(
  '/:id/release',
  authorize('holds:delete'),
  asyncHandler(async (req, res) => {
    const hold = await holdService.releaseHold(req.params.id, req.user!.userId);
    return sendSuccess(res, hold, 'Hold released successfully');
  })
);

export default router;
