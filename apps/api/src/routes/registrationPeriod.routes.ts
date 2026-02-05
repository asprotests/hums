import { Router, type Router as RouterType } from 'express';
import { registrationPeriodService } from '../services/registrationPeriod.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createRegistrationPeriodSchema,
  updateRegistrationPeriodSchema,
  registrationPeriodQuerySchema,
} from '../validators/registrationPeriod.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/registration-periods
 * @desc Get all registration periods with filters
 * @access Private (registration:read)
 */
router.get(
  '/',
  authorize('registration:read'),
  validate(registrationPeriodQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = req.query as {
      semesterId?: string;
      type?: 'REGULAR' | 'LATE' | 'DROP_ADD';
      isActive?: boolean;
    };

    const periods = await registrationPeriodService.getPeriods(filters);
    return sendSuccess(res, periods);
  })
);

/**
 * @route GET /api/v1/registration-periods/status
 * @desc Get current registration status
 * @access Private (any authenticated user)
 */
router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const status = await registrationPeriodService.getRegistrationStatus();
    return sendSuccess(res, status);
  })
);

/**
 * @route GET /api/v1/registration-periods/:id
 * @desc Get registration period by ID
 * @access Private (registration:read)
 */
router.get(
  '/:id',
  authorize('registration:read'),
  asyncHandler(async (req, res) => {
    const period = await registrationPeriodService.getPeriodById(req.params.id);
    return sendSuccess(res, period);
  })
);

/**
 * @route POST /api/v1/registration-periods
 * @desc Create a new registration period
 * @access Private (registration:create)
 */
router.post(
  '/',
  authorize('registration:create'),
  validate(createRegistrationPeriodSchema),
  asyncHandler(async (req, res) => {
    const period = await registrationPeriodService.createPeriod(
      req.body,
      req.user?.userId
    );
    return sendCreated(res, period, 'Registration period created successfully');
  })
);

/**
 * @route PATCH /api/v1/registration-periods/:id
 * @desc Update a registration period
 * @access Private (registration:update)
 */
router.patch(
  '/:id',
  authorize('registration:update'),
  validate(updateRegistrationPeriodSchema),
  asyncHandler(async (req, res) => {
    const period = await registrationPeriodService.updatePeriod(
      req.params.id,
      req.body,
      req.user?.userId
    );
    return sendSuccess(res, period, 'Registration period updated successfully');
  })
);

/**
 * @route DELETE /api/v1/registration-periods/:id
 * @desc Delete a registration period
 * @access Private (registration:delete)
 */
router.delete(
  '/:id',
  authorize('registration:delete'),
  asyncHandler(async (req, res) => {
    await registrationPeriodService.deletePeriod(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Registration period deleted successfully');
  })
);

export default router;
