import { Router, type Router as RouterType } from 'express';
import { scholarshipService } from '../services/scholarship.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createScholarshipSchema,
  updateScholarshipSchema,
  scholarshipQuerySchema,
  awardScholarshipSchema,
  applyAwardToInvoiceSchema,
  revokeAwardSchema,
} from '../validators/advancedFinance.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// ============================================
// Scholarship Management Routes
// ============================================

/**
 * @route   GET /api/v1/scholarships
 * @desc    Get all scholarships with filters
 * @access  Private (finance:read)
 */
router.get(
  '/',
  authenticate,
  authorize('payments:read'),
  validate(scholarshipQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await scholarshipService.getScholarships(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/scholarships
 * @desc    Create a scholarship
 * @access  Private (finance:create)
 */
router.post(
  '/',
  authenticate,
  authorize('payments:create'),
  validate(createScholarshipSchema),
  asyncHandler(async (req, res) => {
    const scholarship = await scholarshipService.createScholarship(
      req.body,
      req.user!.userId
    );
    return sendCreated(res, scholarship, 'Scholarship created');
  })
);

/**
 * @route   GET /api/v1/scholarships/:id
 * @desc    Get scholarship by ID
 * @access  Private (finance:read)
 */
router.get(
  '/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const scholarship = await scholarshipService.getScholarshipById(req.params.id);
    return sendSuccess(res, scholarship);
  })
);

/**
 * @route   PATCH /api/v1/scholarships/:id
 * @desc    Update scholarship
 * @access  Private (finance:update)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('payments:update'),
  validate(updateScholarshipSchema),
  asyncHandler(async (req, res) => {
    const scholarship = await scholarshipService.updateScholarship(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, scholarship, 'Scholarship updated');
  })
);

/**
 * @route   DELETE /api/v1/scholarships/:id
 * @desc    Delete scholarship
 * @access  Private (finance:delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('payments:delete'),
  asyncHandler(async (req, res) => {
    await scholarshipService.deleteScholarship(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Scholarship deleted');
  })
);

/**
 * @route   POST /api/v1/scholarships/:id/award
 * @desc    Award scholarship to student
 * @access  Private (finance:create)
 */
router.post(
  '/:id/award',
  authenticate,
  authorize('payments:create'),
  validate(awardScholarshipSchema),
  asyncHandler(async (req, res) => {
    const { studentId, amount, notes } = req.body;
    const award = await scholarshipService.awardScholarship(
      studentId,
      req.params.id,
      amount,
      req.user!.userId,
      notes
    );
    return sendCreated(res, award, 'Scholarship awarded');
  })
);

/**
 * @route   GET /api/v1/scholarships/:id/eligible-students
 * @desc    Get eligible students for scholarship
 * @access  Private (finance:read)
 */
router.get(
  '/:id/eligible-students',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const students = await scholarshipService.getEligibleStudents(req.params.id);
    return sendSuccess(res, students);
  })
);

// ============================================
// Student Scholarship Routes
// ============================================

/**
 * @route   GET /api/v1/students/:id/scholarships
 * @desc    Get student's scholarships
 * @access  Private (finance:read)
 */
router.get(
  '/student/:studentId',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const scholarships = await scholarshipService.getStudentScholarships(
      req.params.studentId
    );
    return sendSuccess(res, scholarships);
  })
);

// ============================================
// Scholarship Award Routes
// ============================================

/**
 * @route   POST /api/v1/scholarship-awards/:id/approve
 * @desc    Approve scholarship award
 * @access  Private (finance:update)
 */
router.post(
  '/awards/:id/approve',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const award = await scholarshipService.approveAward(req.params.id, req.user!.userId);
    return sendSuccess(res, award, 'Award approved');
  })
);

/**
 * @route   POST /api/v1/scholarship-awards/:id/apply-to-invoice
 * @desc    Apply scholarship award to invoice
 * @access  Private (finance:update)
 */
router.post(
  '/awards/:id/apply-to-invoice',
  authenticate,
  authorize('payments:update'),
  validate(applyAwardToInvoiceSchema),
  asyncHandler(async (req, res) => {
    const award = await scholarshipService.applyToInvoice(
      req.params.id,
      req.body.invoiceId,
      req.user!.userId
    );
    return sendSuccess(res, award, 'Award applied to invoice');
  })
);

/**
 * @route   POST /api/v1/scholarship-awards/:id/revoke
 * @desc    Revoke scholarship award
 * @access  Private (finance:update)
 */
router.post(
  '/awards/:id/revoke',
  authenticate,
  authorize('payments:update'),
  validate(revokeAwardSchema),
  asyncHandler(async (req, res) => {
    const award = await scholarshipService.revokeAward(
      req.params.id,
      req.body.reason,
      req.user!.userId
    );
    return sendSuccess(res, award, 'Award revoked');
  })
);

export default router;
