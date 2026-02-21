import { Router, type Router as RouterType } from 'express';
import { paymentPlanService } from '../services/paymentPlan.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createPaymentPlanSchema,
  paymentPlanQuerySchema,
  payInstallmentSchema,
} from '../validators/advancedFinance.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// ============================================
// Payment Plan Routes
// ============================================

/**
 * @route   GET /api/v1/payment-plans
 * @desc    Get all payment plans with filters
 * @access  Private (finance:read)
 */
router.get(
  '/',
  authenticate,
  authorize('payments:read'),
  validate(paymentPlanQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await paymentPlanService.getPaymentPlans(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/payment-plans/overdue
 * @desc    Get overdue installments
 * @access  Private (finance:read)
 */
router.get(
  '/overdue',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const installments = await paymentPlanService.getOverdueInstallments();
    return sendSuccess(res, installments);
  })
);

/**
 * @route   POST /api/v1/payment-plans
 * @desc    Create a payment plan
 * @access  Private (finance:create)
 */
router.post(
  '/',
  authenticate,
  authorize('payments:create'),
  validate(createPaymentPlanSchema),
  asyncHandler(async (req, res) => {
    const plan = await paymentPlanService.createPaymentPlan(
      {
        ...req.body,
        startDate: new Date(req.body.startDate),
      },
      req.user!.userId
    );
    return sendCreated(res, plan, 'Payment plan created');
  })
);

/**
 * @route   GET /api/v1/payment-plans/:id
 * @desc    Get payment plan by ID
 * @access  Private (finance:read)
 */
router.get(
  '/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const plan = await paymentPlanService.getPlanById(req.params.id);
    return sendSuccess(res, plan);
  })
);

/**
 * @route   POST /api/v1/payment-plans/:id/pay-installment
 * @desc    Record installment payment
 * @access  Private (finance:create)
 */
router.post(
  '/:id/pay-installment',
  authenticate,
  authorize('payments:create'),
  validate(payInstallmentSchema),
  asyncHandler(async (req, res) => {
    const installment = await paymentPlanService.recordInstallmentPayment(
      req.params.id,
      req.body.amount,
      req.body.paymentId,
      req.user!.userId
    );
    return sendSuccess(res, installment, 'Installment payment recorded');
  })
);

/**
 * @route   POST /api/v1/payment-plans/:id/default
 * @desc    Mark payment plan as defaulted
 * @access  Private (finance:update)
 */
router.post(
  '/:id/default',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const plan = await paymentPlanService.markPlanDefaulted(
      req.params.id,
      req.user!.userId
    );
    return sendSuccess(res, plan, 'Payment plan marked as defaulted');
  })
);

/**
 * @route   POST /api/v1/payment-plans/:id/cancel
 * @desc    Cancel payment plan
 * @access  Private (finance:update)
 */
router.post(
  '/:id/cancel',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const plan = await paymentPlanService.cancelPlan(req.params.id, req.user!.userId);
    return sendSuccess(res, plan, 'Payment plan cancelled');
  })
);

/**
 * @route   POST /api/v1/payment-plans/calculate-late-fees
 * @desc    Calculate and apply late fees
 * @access  Private (finance:update)
 */
router.post(
  '/calculate-late-fees',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (_req, res) => {
    const result = await paymentPlanService.calculateLateFees();
    return sendSuccess(res, result, `Late fees calculated for ${result.updated} installments`);
  })
);

/**
 * @route   GET /api/v1/payment-plans/student/:studentId
 * @desc    Get student's payment plans
 * @access  Private (finance:read)
 */
router.get(
  '/student/:studentId',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const plans = await paymentPlanService.getStudentPlans(req.params.studentId);
    return sendSuccess(res, plans);
  })
);

export default router;
