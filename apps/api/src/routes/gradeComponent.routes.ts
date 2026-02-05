import { Router, type Router as RouterType } from 'express';
import { gradeComponentService } from '../services/gradeComponent.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createGradeComponentSchema,
  updateGradeComponentSchema,
  copyComponentsSchema,
} from '../validators/grading.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/classes/:classId/components
 * @desc    Get all grade components for a class
 * @access  Private (grades:read)
 */
router.get(
  '/classes/:classId/components',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const components = await gradeComponentService.getClassComponents(req.params.classId);
    return sendSuccess(res, components);
  })
);

/**
 * @route   POST /api/v1/classes/:classId/components
 * @desc    Create a new grade component for a class
 * @access  Private (grades:create)
 */
router.post(
  '/classes/:classId/components',
  authorize('grades:create'),
  validate(createGradeComponentSchema),
  asyncHandler(async (req, res) => {
    const component = await gradeComponentService.createComponent(
      req.params.classId,
      req.body,
      req.user?.userId
    );
    return sendCreated(res, component, 'Grade component created successfully');
  })
);

/**
 * @route   GET /api/v1/classes/:classId/components/validate-weights
 * @desc    Validate that component weights sum to 100%
 * @access  Private (grades:read)
 */
router.get(
  '/classes/:classId/components/validate-weights',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const result = await gradeComponentService.validateWeights(req.params.classId);
    return sendSuccess(res, result);
  })
);

/**
 * @route   POST /api/v1/grade-components/copy
 * @desc    Copy grade components from one class to another
 * @access  Private (grades:create)
 */
router.post(
  '/grade-components/copy',
  authorize('grades:create'),
  validate(copyComponentsSchema),
  asyncHandler(async (req, res) => {
    const components = await gradeComponentService.copyComponentsFromClass(
      req.body,
      req.user?.userId
    );
    return sendCreated(res, components, 'Grade components copied successfully');
  })
);

/**
 * @route   GET /api/v1/grade-components/:id
 * @desc    Get grade component by ID
 * @access  Private (grades:read)
 */
router.get(
  '/grade-components/:id',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const component = await gradeComponentService.getComponent(req.params.id);
    return sendSuccess(res, component);
  })
);

/**
 * @route   PATCH /api/v1/grade-components/:id
 * @desc    Update grade component
 * @access  Private (grades:update)
 */
router.patch(
  '/grade-components/:id',
  authorize('grades:update'),
  validate(updateGradeComponentSchema),
  asyncHandler(async (req, res) => {
    const component = await gradeComponentService.updateComponent(
      req.params.id,
      req.body,
      req.user?.userId
    );
    return sendSuccess(res, component, 'Grade component updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/grade-components/:id
 * @desc    Delete grade component
 * @access  Private (grades:delete)
 */
router.delete(
  '/grade-components/:id',
  authorize('grades:delete'),
  asyncHandler(async (req, res) => {
    await gradeComponentService.deleteComponent(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Grade component deleted successfully');
  })
);

/**
 * @route   POST /api/v1/grade-components/:id/publish
 * @desc    Publish grade component (make grades visible to students)
 * @access  Private (grades:update)
 */
router.post(
  '/grade-components/:id/publish',
  authorize('grades:update'),
  asyncHandler(async (req, res) => {
    const component = await gradeComponentService.publishComponent(
      req.params.id,
      req.user?.userId
    );
    return sendSuccess(res, component, 'Grade component published');
  })
);

/**
 * @route   POST /api/v1/grade-components/:id/unpublish
 * @desc    Unpublish grade component
 * @access  Private (grades:update)
 */
router.post(
  '/grade-components/:id/unpublish',
  authorize('grades:update'),
  asyncHandler(async (req, res) => {
    const component = await gradeComponentService.unpublishComponent(
      req.params.id,
      req.user?.userId
    );
    return sendSuccess(res, component, 'Grade component unpublished');
  })
);

export default router;
