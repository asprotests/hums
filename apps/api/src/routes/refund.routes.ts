import { Router, type Router as RouterType } from 'express';
import { refundService } from '../services/refund.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createRefundSchema,
  refundQuerySchema,
  rejectRefundSchema,
  processRefundSchema,
} from '../validators/advancedFinance.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// ============================================
// Refund Routes
// ============================================

/**
 * @route   GET /api/v1/refunds
 * @desc    Get all refund requests with filters
 * @access  Private (finance:read)
 */
router.get(
  '/',
  authenticate,
  authorize('payments:read'),
  validate(refundQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await refundService.getRefunds(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/refunds/pending
 * @desc    Get pending refund requests
 * @access  Private (finance:read)
 */
router.get(
  '/pending',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const refunds = await refundService.getPendingRefunds();
    return sendSuccess(res, refunds);
  })
);

/**
 * @route   POST /api/v1/refunds
 * @desc    Request a refund
 * @access  Private (finance:create)
 */
router.post(
  '/',
  authenticate,
  authorize('payments:create'),
  validate(createRefundSchema),
  asyncHandler(async (req, res) => {
    const refund = await refundService.requestRefund(req.body, req.user!.userId);
    return sendCreated(res, refund, 'Refund request submitted');
  })
);

/**
 * @route   GET /api/v1/refunds/:id
 * @desc    Get refund request by ID
 * @access  Private (finance:read)
 */
router.get(
  '/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const refund = await refundService.getRefundById(req.params.id);
    return sendSuccess(res, refund);
  })
);

/**
 * @route   POST /api/v1/refunds/:id/approve
 * @desc    Approve refund request
 * @access  Private (finance:update)
 */
router.post(
  '/:id/approve',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const refund = await refundService.approveRefund(req.params.id, req.user!.userId);
    return sendSuccess(res, refund, 'Refund approved');
  })
);

/**
 * @route   POST /api/v1/refunds/:id/reject
 * @desc    Reject refund request
 * @access  Private (finance:update)
 */
router.post(
  '/:id/reject',
  authenticate,
  authorize('payments:update'),
  validate(rejectRefundSchema),
  asyncHandler(async (req, res) => {
    const refund = await refundService.rejectRefund(
      req.params.id,
      req.body.reason,
      req.user!.userId
    );
    return sendSuccess(res, refund, 'Refund rejected');
  })
);

/**
 * @route   POST /api/v1/refunds/:id/process
 * @desc    Process refund (complete with reference)
 * @access  Private (finance:update)
 */
router.post(
  '/:id/process',
  authenticate,
  authorize('payments:update'),
  validate(processRefundSchema),
  asyncHandler(async (req, res) => {
    const refund = await refundService.completeRefund(
      req.params.id,
      req.body.refundMethod,
      req.body.refundReference,
      req.user!.userId
    );
    return sendSuccess(res, refund, 'Refund processed');
  })
);

/**
 * @route   DELETE /api/v1/refunds/:id
 * @desc    Delete refund request (only pending)
 * @access  Private (finance:delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('payments:delete'),
  asyncHandler(async (req, res) => {
    await refundService.deleteRefund(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Refund request deleted');
  })
);

/**
 * @route   GET /api/v1/refunds/student/:studentId
 * @desc    Get student's refund requests
 * @access  Private (finance:read)
 */
router.get(
  '/student/:studentId',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const refunds = await refundService.getStudentRefunds(req.params.studentId);
    return sendSuccess(res, refunds);
  })
);

export default router;
