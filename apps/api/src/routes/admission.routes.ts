import { Router, type Router as RouterType } from 'express';
import { admissionService } from '../services/admission.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  reviewApplicationSchema,
  rejectApplicationSchema,
  applicationQuerySchema,
  applicationIdSchema,
} from '../validators/admission.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/admissions
 * @desc    Get all admission applications
 * @access  Private (students:read)
 */
router.get(
  '/',
  authorize('students:read'),
  validate(applicationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const applications = await admissionService.getApplications(req.query as any);
    return sendPaginated(res, applications.data, applications.pagination);
  })
);

/**
 * @route   GET /api/v1/admissions/statistics
 * @desc    Get admission statistics
 * @access  Private (students:read)
 */
router.get(
  '/statistics',
  authorize('students:read'),
  asyncHandler(async (_req, res) => {
    const statistics = await admissionService.getStatistics();
    return sendSuccess(res, statistics);
  })
);

/**
 * @route   POST /api/v1/admissions
 * @desc    Create a new admission application
 * @access  Private (students:create)
 */
router.post(
  '/',
  authorize('students:create'),
  validate(createApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await admissionService.createApplication(req.body, req.user?.userId);
    return sendCreated(res, application, 'Application submitted successfully');
  })
);

/**
 * @route   GET /api/v1/admissions/:id
 * @desc    Get admission application by ID
 * @access  Private (students:read)
 */
router.get(
  '/:id',
  authorize('students:read'),
  validate(applicationIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const application = await admissionService.getApplicationById(req.params.id);
    return sendSuccess(res, application);
  })
);

/**
 * @route   PATCH /api/v1/admissions/:id
 * @desc    Update admission application
 * @access  Private (students:update)
 */
router.patch(
  '/:id',
  authorize('students:update'),
  validate(applicationIdSchema, 'params'),
  validate(updateApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await admissionService.updateApplication(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, application, 'Application updated successfully');
  })
);

/**
 * @route   PATCH /api/v1/admissions/:id/review
 * @desc    Review admission application (change status)
 * @access  Private (students:update)
 */
router.patch(
  '/:id/review',
  authorize('students:update'),
  validate(applicationIdSchema, 'params'),
  validate(reviewApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await admissionService.reviewApplication(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, application, 'Application reviewed successfully');
  })
);

/**
 * @route   PATCH /api/v1/admissions/:id/approve
 * @desc    Approve admission application
 * @access  Private (students:update)
 */
router.patch(
  '/:id/approve',
  authorize('students:update'),
  validate(applicationIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const application = await admissionService.approveApplication(req.params.id, req.user!.userId);
    return sendSuccess(res, application, 'Application approved successfully');
  })
);

/**
 * @route   PATCH /api/v1/admissions/:id/reject
 * @desc    Reject admission application
 * @access  Private (students:update)
 */
router.patch(
  '/:id/reject',
  authorize('students:update'),
  validate(applicationIdSchema, 'params'),
  validate(rejectApplicationSchema),
  asyncHandler(async (req, res) => {
    const application = await admissionService.rejectApplication(
      req.params.id,
      req.body.reason,
      req.user!.userId
    );
    return sendSuccess(res, application, 'Application rejected');
  })
);

/**
 * @route   POST /api/v1/admissions/:id/enroll
 * @desc    Enroll student from approved application
 * @access  Private (students:create)
 */
router.post(
  '/:id/enroll',
  authorize('students:create'),
  validate(applicationIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await admissionService.enrollStudent(req.params.id, req.user!.userId);
    return sendCreated(res, result, 'Student enrolled successfully');
  })
);

export default router;
