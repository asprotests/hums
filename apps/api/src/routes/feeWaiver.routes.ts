import { Router, type Router as RouterType } from 'express';
import { feeWaiverService } from '../services/feeWaiver.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createFeeWaiverSchema,
  feeWaiverQuerySchema,
  rejectWaiverSchema,
  applyWaiverToInvoiceSchema,
} from '../validators/advancedFinance.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// ============================================
// Fee Waiver Routes
// ============================================

/**
 * @route   GET /api/v1/fee-waivers
 * @desc    Get all fee waivers with filters
 * @access  Private (finance:read)
 */
router.get(
  '/',
  authenticate,
  authorize('payments:read'),
  validate(feeWaiverQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await feeWaiverService.getWaivers(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/fee-waivers/pending
 * @desc    Get pending fee waivers
 * @access  Private (finance:read)
 */
router.get(
  '/pending',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const waivers = await feeWaiverService.getPendingWaivers();
    return sendSuccess(res, waivers);
  })
);

/**
 * @route   POST /api/v1/fee-waivers
 * @desc    Request a fee waiver
 * @access  Private (finance:create)
 */
router.post(
  '/',
  authenticate,
  authorize('payments:create'),
  validate(createFeeWaiverSchema),
  asyncHandler(async (req, res) => {
    const waiver = await feeWaiverService.requestWaiver(
      {
        ...req.body,
        validFrom: new Date(req.body.validFrom),
        validTo: new Date(req.body.validTo),
      },
      req.user!.userId
    );
    return sendCreated(res, waiver, 'Fee waiver request submitted');
  })
);

/**
 * @route   GET /api/v1/fee-waivers/:id
 * @desc    Get fee waiver by ID
 * @access  Private (finance:read)
 */
router.get(
  '/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const waiver = await feeWaiverService.getWaiverById(req.params.id);
    return sendSuccess(res, waiver);
  })
);

/**
 * @route   POST /api/v1/fee-waivers/:id/approve
 * @desc    Approve fee waiver
 * @access  Private (finance:update)
 */
router.post(
  '/:id/approve',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const waiver = await feeWaiverService.approveWaiver(req.params.id, req.user!.userId);
    return sendSuccess(res, waiver, 'Fee waiver approved');
  })
);

/**
 * @route   POST /api/v1/fee-waivers/:id/reject
 * @desc    Reject fee waiver
 * @access  Private (finance:update)
 */
router.post(
  '/:id/reject',
  authenticate,
  authorize('payments:update'),
  validate(rejectWaiverSchema),
  asyncHandler(async (req, res) => {
    const waiver = await feeWaiverService.rejectWaiver(
      req.params.id,
      req.body.reason,
      req.user!.userId
    );
    return sendSuccess(res, waiver, 'Fee waiver rejected');
  })
);

/**
 * @route   POST /api/v1/fee-waivers/:id/apply-to-invoice
 * @desc    Apply fee waiver to invoice
 * @access  Private (finance:update)
 */
router.post(
  '/:id/apply-to-invoice',
  authenticate,
  authorize('payments:update'),
  validate(applyWaiverToInvoiceSchema),
  asyncHandler(async (req, res) => {
    const waiver = await feeWaiverService.applyToInvoice(
      req.params.id,
      req.body.invoiceId,
      req.user!.userId
    );
    return sendSuccess(res, waiver, 'Fee waiver applied to invoice');
  })
);

/**
 * @route   DELETE /api/v1/fee-waivers/:id
 * @desc    Delete fee waiver (only pending)
 * @access  Private (finance:delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('payments:delete'),
  asyncHandler(async (req, res) => {
    await feeWaiverService.deleteWaiver(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Fee waiver deleted');
  })
);

/**
 * @route   GET /api/v1/fee-waivers/student/:studentId
 * @desc    Get student's fee waivers
 * @access  Private (finance:read)
 */
router.get(
  '/student/:studentId',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const waivers = await feeWaiverService.getStudentWaivers(req.params.studentId);
    return sendSuccess(res, waivers);
  })
);

export default router;
