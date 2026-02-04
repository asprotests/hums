import { Router, type Router as RouterType } from 'express';
import { semesterService } from '../services/semester.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createSemesterSchema,
  updateSemesterSchema,
  semesterQuerySchema,
  semesterIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/semesters
 * @desc    Get all semesters with optional filters
 * @access  Private (courses:read)
 */
router.get(
  '/',
  authorize('courses:read'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const semesters = await semesterService.getSemesters(req.query as any);
    return sendSuccess(res, semesters);
  })
);

/**
 * @route   GET /api/v1/semesters/current
 * @desc    Get current semester
 * @access  Private (courses:read)
 */
router.get(
  '/current',
  authorize('courses:read'),
  asyncHandler(async (_req, res) => {
    const semester = await semesterService.getCurrentSemester();
    return sendSuccess(res, semester);
  })
);

/**
 * @route   GET /api/v1/semesters/registration-status
 * @desc    Check if registration is currently open
 * @access  Private (courses:read)
 */
router.get(
  '/registration-status',
  authorize('courses:read'),
  asyncHandler(async (_req, res) => {
    const status = await semesterService.isRegistrationOpen();
    return sendSuccess(res, status);
  })
);

/**
 * @route   POST /api/v1/semesters
 * @desc    Create a new semester
 * @access  Private (courses:create)
 */
router.post(
  '/',
  authorize('courses:create'),
  validate(createSemesterSchema),
  asyncHandler(async (req, res) => {
    const semester = await semesterService.createSemester(req.body, req.user?.userId);
    return sendCreated(res, semester, 'Semester created successfully');
  })
);

/**
 * @route   GET /api/v1/semesters/:id
 * @desc    Get semester by ID
 * @access  Private (courses:read)
 */
router.get(
  '/:id',
  authorize('courses:read'),
  validate(semesterIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const semester = await semesterService.getSemesterById(req.params.id);
    return sendSuccess(res, semester);
  })
);

/**
 * @route   PATCH /api/v1/semesters/:id
 * @desc    Update semester
 * @access  Private (courses:update)
 */
router.patch(
  '/:id',
  authorize('courses:update'),
  validate(semesterIdSchema, 'params'),
  validate(updateSemesterSchema),
  asyncHandler(async (req, res) => {
    const semester = await semesterService.updateSemester(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, semester, 'Semester updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/semesters/:id
 * @desc    Delete semester
 * @access  Private (courses:delete)
 */
router.delete(
  '/:id',
  authorize('courses:delete'),
  validate(semesterIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await semesterService.deleteSemester(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   PATCH /api/v1/semesters/:id/set-current
 * @desc    Set semester as current
 * @access  Private (courses:update)
 */
router.patch(
  '/:id/set-current',
  authorize('courses:update'),
  validate(semesterIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const semester = await semesterService.setCurrentSemester(req.params.id, req.user?.userId);
    return sendSuccess(res, semester, 'Semester set as current');
  })
);

export default router;
