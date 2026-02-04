import { Router, type Router as RouterType } from 'express';
import { paymentService } from '../services/payment.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import {
  recordPaymentSchema,
  paymentQuerySchema,
  voidPaymentSchema,
} from '../validators/finance.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/payments
 * @desc    Get all payments with pagination and filters
 * @access  Private (payments:read)
 */
router.get(
  '/',
  authorize('payments:read'),
  validate(paymentQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await paymentService.getPayments(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/payments
 * @desc    Record a new payment
 * @access  Private (payments:create)
 */
router.post(
  '/',
  authorize('payments:create'),
  validate(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.recordPayment(req.body, req.user!.userId);
    return sendCreated(res, payment, 'Payment recorded successfully');
  })
);

/**
 * @route   GET /api/v1/payments/student/:studentId
 * @desc    Get payments for a specific student
 * @access  Private (payments:read)
 */
router.get(
  '/student/:studentId',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const payments = await paymentService.getPaymentsByStudent(req.params.studentId);
    return sendSuccess(res, payments);
  })
);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment by ID
 * @access  Private (payments:read)
 */
router.get(
  '/:id',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.id);
    return sendSuccess(res, payment);
  })
);

/**
 * @route   GET /api/v1/payments/:id/receipt
 * @desc    Generate receipt for a payment
 * @access  Private (payments:read)
 */
router.get(
  '/:id/receipt',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const receipt = await paymentService.generateReceipt(req.params.id);
    return sendSuccess(res, receipt);
  })
);

/**
 * @route   PATCH /api/v1/payments/:id/void
 * @desc    Void a payment
 * @access  Private (payments:delete)
 */
router.patch(
  '/:id/void',
  authorize('payments:delete'),
  validate(voidPaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.voidPayment(req.params.id, req.body.reason, req.user!.userId);
    return sendSuccess(res, payment, 'Payment voided successfully');
  })
);

export default router;
