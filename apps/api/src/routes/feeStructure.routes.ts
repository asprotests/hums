import { Router, type Router as RouterType } from 'express';
import { feeStructureService } from '../services/feeStructure.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  feeStructureQuerySchema,
} from '../validators/finance.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/fee-structures
 * @desc    Get all fee structures with pagination and filters
 * @access  Private (settings:read)
 */
router.get(
  '/',
  authorize('settings:read'),
  validate(feeStructureQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await feeStructureService.getFeeStructures(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/fee-structures
 * @desc    Create a new fee structure
 * @access  Private (settings:create)
 */
router.post(
  '/',
  authorize('settings:create'),
  validate(createFeeStructureSchema),
  asyncHandler(async (req, res) => {
    const feeStructure = await feeStructureService.createFeeStructure(req.body);
    return sendCreated(res, feeStructure, 'Fee structure created successfully');
  })
);

/**
 * @route   GET /api/v1/fee-structures/program/:programId
 * @desc    Get fee structures by program
 * @access  Private (settings:read)
 */
router.get(
  '/program/:programId',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const feeStructures = await feeStructureService.getFeeStructuresByProgram(req.params.programId);
    return sendSuccess(res, feeStructures);
  })
);

/**
 * @route   GET /api/v1/fee-structures/:id
 * @desc    Get fee structure by ID
 * @access  Private (settings:read)
 */
router.get(
  '/:id',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const feeStructure = await feeStructureService.getFeeStructureById(req.params.id);
    return sendSuccess(res, feeStructure);
  })
);

/**
 * @route   PATCH /api/v1/fee-structures/:id
 * @desc    Update a fee structure
 * @access  Private (settings:update)
 */
router.patch(
  '/:id',
  authorize('settings:update'),
  validate(updateFeeStructureSchema),
  asyncHandler(async (req, res) => {
    const feeStructure = await feeStructureService.updateFeeStructure(req.params.id, req.body);
    return sendSuccess(res, feeStructure, 'Fee structure updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/fee-structures/:id
 * @desc    Delete a fee structure
 * @access  Private (settings:delete)
 */
router.delete(
  '/:id',
  authorize('settings:delete'),
  asyncHandler(async (req, res) => {
    const result = await feeStructureService.deleteFeeStructure(req.params.id);
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/fee-structures/:id/total
 * @desc    Calculate total fee for a fee structure
 * @access  Private (settings:read)
 */
router.get(
  '/:id/total',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const total = await feeStructureService.calculateTotalFee(req.params.id);
    return sendSuccess(res, { total });
  })
);

export default router;
