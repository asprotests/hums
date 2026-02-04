import { Router, type Router as RouterType } from 'express';
import { invoiceService } from '../services/invoice.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import {
  generateInvoiceSchema,
  generateBulkInvoicesSchema,
  invoiceQuerySchema,
  voidInvoiceSchema,
} from '../validators/finance.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/invoices
 * @desc    Get all invoices with pagination and filters
 * @access  Private (invoices:read)
 */
router.get(
  '/',
  authorize('invoices:read'),
  validate(invoiceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await invoiceService.getInvoices(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/invoices/generate
 * @desc    Generate invoice for a student
 * @access  Private (invoices:create)
 */
router.post(
  '/generate',
  authorize('invoices:create'),
  validate(generateInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await invoiceService.generateInvoice(req.body);
    return sendCreated(res, invoice, 'Invoice generated successfully');
  })
);

/**
 * @route   POST /api/v1/invoices/generate-bulk
 * @desc    Generate invoices for multiple students
 * @access  Private (invoices:create)
 */
router.post(
  '/generate-bulk',
  authorize('invoices:create'),
  validate(generateBulkInvoicesSchema),
  asyncHandler(async (req, res) => {
    const result = await invoiceService.generateBulkInvoices(req.body);
    return sendSuccess(res, result, 'Bulk invoice generation completed');
  })
);

/**
 * @route   GET /api/v1/invoices/outstanding
 * @desc    Get all outstanding invoices
 * @access  Private (invoices:read)
 */
router.get(
  '/outstanding',
  authorize('invoices:read'),
  asyncHandler(async (_req, res) => {
    const invoices = await invoiceService.getOutstandingInvoices();
    return sendSuccess(res, invoices);
  })
);

/**
 * @route   GET /api/v1/invoices/overdue
 * @desc    Get all overdue invoices
 * @access  Private (invoices:read)
 */
router.get(
  '/overdue',
  authorize('invoices:read'),
  asyncHandler(async (_req, res) => {
    const invoices = await invoiceService.getOverdueInvoices();
    return sendSuccess(res, invoices);
  })
);

/**
 * @route   GET /api/v1/invoices/student/:studentId
 * @desc    Get invoices for a specific student
 * @access  Private (invoices:read)
 */
router.get(
  '/student/:studentId',
  authorize('invoices:read'),
  asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getInvoicesByStudent(req.params.studentId);
    return sendSuccess(res, invoices);
  })
);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private (invoices:read)
 */
router.get(
  '/:id',
  authorize('invoices:read'),
  asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return sendSuccess(res, invoice);
  })
);

/**
 * @route   PATCH /api/v1/invoices/:id/void
 * @desc    Void an invoice
 * @access  Private (invoices:delete)
 */
router.patch(
  '/:id/void',
  authorize('invoices:delete'),
  validate(voidInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await invoiceService.voidInvoice(req.params.id, req.body.reason);
    return sendSuccess(res, invoice, 'Invoice voided successfully');
  })
);

export default router;
