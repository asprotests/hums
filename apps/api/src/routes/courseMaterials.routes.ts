import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { courseMaterialsService } from '../services/courseMaterials.service.js';
import {
  createMaterialSchema,
  updateMaterialSchema,
  reorderMaterialsSchema,
  materialQuerySchema,
} from '../validators/academicPortal.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/classes/:classId/materials
 * Get all materials for a class
 */
router.get(
  '/classes/:classId/materials',
  authorize('materials:read'),
  validate(materialQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { includeUnpublished } = req.query;

    // Students can only see published materials
    const canSeeUnpublished = req.user!.roles?.some((r: string) =>
      ['admin', 'lecturer', 'hod', 'dean'].includes(r.toLowerCase())
    );

    const materials = await courseMaterialsService.getMaterials(
      classId,
      canSeeUnpublished && includeUnpublished === 'true'
    );

    return sendSuccess(res, materials);
  })
);

/**
 * POST /api/v1/classes/:classId/materials
 * Upload a new material to a class
 */
router.post(
  '/classes/:classId/materials',
  authorize('materials:create'),
  validate(createMaterialSchema),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const userId = req.user!.userId;

    const material = await courseMaterialsService.createMaterial(
      {
        classId,
        ...req.body,
      },
      userId
    );

    return sendCreated(res, material, 'Material uploaded successfully');
  })
);

/**
 * GET /api/v1/materials/:id
 * Get a single material by ID
 */
router.get(
  '/materials/:id',
  authorize('materials:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const material = await courseMaterialsService.getMaterial(id);

    // Students can only see published materials
    const canSeeUnpublished = req.user!.roles?.some((r: string) =>
      ['admin', 'lecturer', 'hod', 'dean'].includes(r.toLowerCase())
    );

    if (!material.isPublished && !canSeeUnpublished) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    return sendSuccess(res, material);
  })
);

/**
 * PATCH /api/v1/materials/:id
 * Update a material
 */
router.patch(
  '/materials/:id',
  authorize('materials:update'),
  validate(updateMaterialSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const material = await courseMaterialsService.updateMaterial(id, req.body, userId);

    return sendSuccess(res, material, 'Material updated successfully');
  })
);

/**
 * DELETE /api/v1/materials/:id
 * Delete a material
 */
router.delete(
  '/materials/:id',
  authorize('materials:delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    await courseMaterialsService.deleteMaterial(id, userId);

    return sendSuccess(res, null, 'Material deleted successfully');
  })
);

/**
 * POST /api/v1/materials/:id/publish
 * Publish a material
 */
router.post(
  '/materials/:id/publish',
  authorize('materials:update'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const material = await courseMaterialsService.publishMaterial(id, userId);

    return sendSuccess(res, material, 'Material published successfully');
  })
);

/**
 * POST /api/v1/materials/:id/unpublish
 * Unpublish a material
 */
router.post(
  '/materials/:id/unpublish',
  authorize('materials:update'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const material = await courseMaterialsService.unpublishMaterial(id, userId);

    return sendSuccess(res, material, 'Material unpublished successfully');
  })
);

/**
 * PATCH /api/v1/classes/:classId/materials/reorder
 * Reorder materials within a class
 */
router.patch(
  '/classes/:classId/materials/reorder',
  authorize('materials:update'),
  validate(reorderMaterialsSchema),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { orderedIds } = req.body;
    const userId = req.user!.userId;

    await courseMaterialsService.reorderMaterials(classId, orderedIds, userId);

    return sendSuccess(res, null, 'Materials reordered successfully');
  })
);

/**
 * GET /api/v1/classes/:classId/materials/stats
 * Get material statistics for a class
 */
router.get(
  '/classes/:classId/materials/stats',
  authorize('materials:read'),
  asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const stats = await courseMaterialsService.getMaterialStats(classId);

    return sendSuccess(res, stats);
  })
);

export default router;
