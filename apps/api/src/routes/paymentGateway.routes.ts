import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { paymentGatewayService } from '../services/paymentGateway.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createPaymentSessionSchema,
  initiatePaymentSchema,
  mobileMoneyPaymentSchema,
  transactionQuerySchema,
} from '../validators/sms.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import { prisma } from '@hums/database';

const router: RouterType = Router();

// ============================================
// Public Routes (Webhooks)
// ============================================

/**
 * @route   POST /api/v1/payment-gateway/webhook/:provider
 * @desc    Handle payment webhook from provider
 * @access  Public (verified by signature)
 */
router.post(
  '/webhook/:provider',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    await paymentGatewayService.handleWebhook(provider, req.body);
    return sendSuccess(res, { received: true }, 'Webhook processed');
  })
);

// ============================================
// Payment Methods & Sessions
// ============================================

/**
 * @route   GET /api/v1/payment-gateway/methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get(
  '/methods',
  authenticate,
  asyncHandler(async (_req, res) => {
    const methods = paymentGatewayService.getAvailableMethods();
    return sendSuccess(res, methods);
  })
);

/**
 * @route   POST /api/v1/payment-gateway/session
 * @desc    Create payment session
 * @access  Private (payments:create)
 */
router.post(
  '/session',
  authenticate,
  authorize('payments:create'),
  validate(createPaymentSessionSchema),
  asyncHandler(async (req, res) => {
    const { studentId, amount, invoiceId, currency } = req.body;
    const session = await paymentGatewayService.createPaymentSession(
      studentId,
      amount,
      invoiceId,
      currency
    );
    return sendCreated(res, session, 'Payment session created');
  })
);

/**
 * @route   GET /api/v1/payment-gateway/session/:id
 * @desc    Get payment session
 * @access  Private
 */
router.get(
  '/session/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await paymentGatewayService.getPaymentSession(req.params.id);
    return sendSuccess(res, session);
  })
);

/**
 * @route   DELETE /api/v1/payment-gateway/session/:id
 * @desc    Cancel payment session
 * @access  Private
 */
router.delete(
  '/session/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await paymentGatewayService.cancelSession(req.params.id);
    return sendSuccess(res, null, 'Payment session cancelled');
  })
);

// ============================================
// Payment Processing
// ============================================

/**
 * @route   POST /api/v1/payment-gateway/initiate
 * @desc    Initiate payment
 * @access  Private (payments:create)
 */
router.post(
  '/initiate',
  authenticate,
  authorize('payments:create'),
  validate(initiatePaymentSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentGatewayService.initiatePayment(req.body);
    return sendSuccess(res, result, result.success ? 'Payment initiated' : 'Payment failed');
  })
);

/**
 * @route   POST /api/v1/payment-gateway/mobile-money
 * @desc    Initiate mobile money payment
 * @access  Private
 */
router.post(
  '/mobile-money',
  authenticate,
  validate(mobileMoneyPaymentSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentGatewayService.initiateMobileMoneyPayment(req.body);
    return sendSuccess(
      res,
      result,
      result.success ? 'Payment initiated. Check your phone to confirm.' : result.error
    );
  })
);

/**
 * @route   GET /api/v1/payment-gateway/verify/:sessionId
 * @desc    Verify payment status
 * @access  Private
 */
router.get(
  '/verify/:sessionId',
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await paymentGatewayService.getPaymentSession(req.params.sessionId);
    if (!session) {
      return sendSuccess(res, { status: 'NOT_FOUND' });
    }
    return sendSuccess(res, {
      status: session.status,
      completedAt: session.completedAt,
    });
  })
);

// ============================================
// Transaction Routes
// ============================================

/**
 * @route   GET /api/v1/payment-gateway/transaction/:id
 * @desc    Get transaction details
 * @access  Private (payments:read)
 */
router.get(
  '/transaction/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const transaction = await paymentGatewayService.getTransaction(req.params.id);
    return sendSuccess(res, transaction);
  })
);

/**
 * @route   GET /api/v1/payment-gateway/transaction/:id/status
 * @desc    Check transaction status
 * @access  Private
 */
router.get(
  '/transaction/:id/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await paymentGatewayService.checkPaymentStatus(req.params.id);
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/payment-gateway/transactions
 * @desc    Get transactions (admin)
 * @access  Private (payments:read)
 */
router.get(
  '/transactions',
  authenticate,
  authorize('payments:read'),
  validate(transactionQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    if (!studentId) {
      return sendSuccess(res, { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    const result = await paymentGatewayService.getTransactionsByStudent(studentId, req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/payment-gateway/invoice/:invoiceId/transactions
 * @desc    Get transactions by invoice
 * @access  Private (payments:read)
 */
router.get(
  '/invoice/:invoiceId/transactions',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const transactions = await paymentGatewayService.getTransactionsByInvoice(req.params.invoiceId);
    return sendSuccess(res, transactions);
  })
);

// ============================================
// Student Self-Service Routes
// ============================================

/**
 * @route   GET /api/v1/payment-gateway/my/session
 * @desc    Get or create payment session for current student
 * @access  Private (student)
 */
router.get(
  '/my/session',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Get student by user ID
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        invoices: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!student) {
      return sendSuccess(res, null, 'Not a student');
    }

    // Calculate outstanding balance
    const outstandingBalance = student.invoices.reduce(
      (sum: number, inv: { amount: any }) => sum + Number(inv.amount),
      0
    );

    return sendSuccess(res, {
      studentId: student.id,
      outstandingBalance,
      invoices: student.invoices,
    });
  })
);

/**
 * @route   POST /api/v1/payment-gateway/my/pay
 * @desc    Student initiates payment
 * @access  Private (student)
 */
router.post(
  '/my/pay',
  authenticate,
  validate(mobileMoneyPaymentSchema.omit({ sessionId: true }).extend({
    amount: z.number().positive(),
    invoiceId: z.string().uuid().optional(),
  })),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { amount, invoiceId, phone, provider } = req.body;

    // Get student
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    if (!student) {
      return sendSuccess(res, { success: false, error: 'Not a student' });
    }

    // Create session
    const session = await paymentGatewayService.createPaymentSession(
      student.id,
      amount,
      invoiceId
    );

    // Initiate mobile money payment
    const result = await paymentGatewayService.initiateMobileMoneyPayment({
      sessionId: session.id,
      phone,
      provider,
    });

    return sendSuccess(
      res,
      {
        ...result,
        sessionId: session.id,
      },
      result.success ? 'Payment initiated. Check your phone to confirm.' : result.error
    );
  })
);

/**
 * @route   GET /api/v1/payment-gateway/my/transactions
 * @desc    Get student's payment transactions
 * @access  Private (student)
 */
router.get(
  '/my/transactions',
  authenticate,
  validate(transactionQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Get student
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    if (!student) {
      return sendPaginated(res, [], { page: 1, limit: 20, total: 0, totalPages: 0 });
    }

    const result = await paymentGatewayService.getTransactionsByStudent(student.id, req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

export default router;
