import { Router, type Router as RouterType } from 'express';
import { academicYearService } from '../services/academicYear.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  academicYearIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/academic-years
 * @desc    Get all academic years
 * @access  Private (courses:read)
 */
router.get(
  '/',
  authorize('courses:read'),
  asyncHandler(async (_req, res) => {
    const academicYears = await academicYearService.getAcademicYears();
    return sendSuccess(res, academicYears);
  })
);

/**
 * @route   GET /api/v1/academic-years/current
 * @desc    Get current academic year
 * @access  Private (courses:read)
 */
router.get(
  '/current',
  authorize('courses:read'),
  asyncHandler(async (_req, res) => {
    const academicYear = await academicYearService.getCurrentAcademicYear();
    return sendSuccess(res, academicYear);
  })
);

/**
 * @route   POST /api/v1/academic-years
 * @desc    Create a new academic year
 * @access  Private (courses:create)
 */
router.post(
  '/',
  authorize('courses:create'),
  validate(createAcademicYearSchema),
  asyncHandler(async (req, res) => {
    const academicYear = await academicYearService.createAcademicYear(req.body, req.user?.userId);
    return sendCreated(res, academicYear, 'Academic year created successfully');
  })
);

/**
 * @route   GET /api/v1/academic-years/:id
 * @desc    Get academic year by ID
 * @access  Private (courses:read)
 */
router.get(
  '/:id',
  authorize('courses:read'),
  validate(academicYearIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const academicYear = await academicYearService.getAcademicYearById(req.params.id);
    return sendSuccess(res, academicYear);
  })
);

/**
 * @route   PATCH /api/v1/academic-years/:id
 * @desc    Update academic year
 * @access  Private (courses:update)
 */
router.patch(
  '/:id',
  authorize('courses:update'),
  validate(academicYearIdSchema, 'params'),
  validate(updateAcademicYearSchema),
  asyncHandler(async (req, res) => {
    const academicYear = await academicYearService.updateAcademicYear(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, academicYear, 'Academic year updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/academic-years/:id
 * @desc    Delete academic year
 * @access  Private (courses:delete)
 */
router.delete(
  '/:id',
  authorize('courses:delete'),
  validate(academicYearIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await academicYearService.deleteAcademicYear(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   PATCH /api/v1/academic-years/:id/set-current
 * @desc    Set academic year as current
 * @access  Private (courses:update)
 */
router.patch(
  '/:id/set-current',
  authorize('courses:update'),
  validate(academicYearIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const academicYear = await academicYearService.setCurrentAcademicYear(req.params.id, req.user?.userId);
    return sendSuccess(res, academicYear, 'Academic year set as current');
  })
);

/**
 * @route   GET /api/v1/academic-years/:id/semesters
 * @desc    Get semesters for an academic year
 * @access  Private (courses:read)
 */
router.get(
  '/:id/semesters',
  authorize('courses:read'),
  validate(academicYearIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const semesters = await academicYearService.getSemesters(req.params.id);
    return sendSuccess(res, semesters);
  })
);

export default router;
