import { Router, type Router as RouterType } from 'express';
import { gradeConfigService } from '../services/gradeConfig.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createGradeScaleSchema,
  updateGradeScaleSchema,
} from '../validators/grading.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/grade-scales
 * @desc    Get all grade scales
 * @access  Private (grades:read)
 */
router.get(
  '/',
  authorize('grades:read'),
  asyncHandler(async (_req, res) => {
    const scales = await gradeConfigService.getGradeScales();
    return sendSuccess(res, scales);
  })
);

/**
 * @route   GET /api/v1/grade-scales/default
 * @desc    Get the default grade scale
 * @access  Private (grades:read)
 */
router.get(
  '/default',
  authorize('grades:read'),
  asyncHandler(async (_req, res) => {
    const scale = await gradeConfigService.getDefaultScale();
    return sendSuccess(res, scale);
  })
);

/**
 * @route   POST /api/v1/grade-scales
 * @desc    Create a new grade scale
 * @access  Private (grades:create)
 */
router.post(
  '/',
  authorize('grades:create'),
  validate(createGradeScaleSchema),
  asyncHandler(async (req, res) => {
    const scale = await gradeConfigService.createGradeScale(req.body, req.user?.userId);
    return sendCreated(res, scale, 'Grade scale created successfully');
  })
);

/**
 * @route   GET /api/v1/grade-scales/:id
 * @desc    Get grade scale by ID
 * @access  Private (grades:read)
 */
router.get(
  '/:id',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const scale = await gradeConfigService.getGradeScale(req.params.id);
    return sendSuccess(res, scale);
  })
);

/**
 * @route   PATCH /api/v1/grade-scales/:id
 * @desc    Update grade scale
 * @access  Private (grades:update)
 */
router.patch(
  '/:id',
  authorize('grades:update'),
  validate(updateGradeScaleSchema),
  asyncHandler(async (req, res) => {
    const scale = await gradeConfigService.updateGradeScale(
      req.params.id,
      req.body,
      req.user?.userId
    );
    return sendSuccess(res, scale, 'Grade scale updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/grade-scales/:id
 * @desc    Delete grade scale
 * @access  Private (grades:delete)
 */
router.delete(
  '/:id',
  authorize('grades:delete'),
  asyncHandler(async (req, res) => {
    await gradeConfigService.deleteGradeScale(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Grade scale deleted successfully');
  })
);

/**
 * @route   PATCH /api/v1/grade-scales/:id/set-default
 * @desc    Set grade scale as default
 * @access  Private (grades:update)
 */
router.patch(
  '/:id/set-default',
  authorize('grades:update'),
  asyncHandler(async (req, res) => {
    const scale = await gradeConfigService.setDefaultScale(req.params.id, req.user?.userId);
    return sendSuccess(res, scale, 'Grade scale set as default');
  })
);

export default router;
