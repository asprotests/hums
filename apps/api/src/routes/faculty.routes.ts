import { Router, type Router as RouterType } from 'express';
import { facultyService } from '../services/faculty.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createFacultySchema,
  updateFacultySchema,
  facultyQuerySchema,
  facultyIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/faculties
 * @desc    Get all faculties with pagination and filters
 * @access  Private (faculties:read)
 */
router.get(
  '/',
  authorize('faculties:read'),
  validate(facultyQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await facultyService.getFaculties(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/faculties
 * @desc    Create a new faculty
 * @access  Private (faculties:create)
 */
router.post(
  '/',
  authorize('faculties:create'),
  validate(createFacultySchema),
  asyncHandler(async (req, res) => {
    const faculty = await facultyService.createFaculty(req.body, req.user?.userId);
    return sendCreated(res, faculty, 'Faculty created successfully');
  })
);

/**
 * @route   GET /api/v1/faculties/:id
 * @desc    Get faculty by ID
 * @access  Private (faculties:read)
 */
router.get(
  '/:id',
  authorize('faculties:read'),
  validate(facultyIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const faculty = await facultyService.getFacultyById(req.params.id);
    return sendSuccess(res, faculty);
  })
);

/**
 * @route   PATCH /api/v1/faculties/:id
 * @desc    Update faculty
 * @access  Private (faculties:update)
 */
router.patch(
  '/:id',
  authorize('faculties:update'),
  validate(facultyIdSchema, 'params'),
  validate(updateFacultySchema),
  asyncHandler(async (req, res) => {
    const faculty = await facultyService.updateFaculty(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, faculty, 'Faculty updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/faculties/:id
 * @desc    Delete faculty (soft delete)
 * @access  Private (faculties:delete)
 */
router.delete(
  '/:id',
  authorize('faculties:delete'),
  validate(facultyIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await facultyService.deleteFaculty(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/faculties/:id/departments
 * @desc    Get departments for a faculty
 * @access  Private (faculties:read)
 */
router.get(
  '/:id/departments',
  authorize('faculties:read'),
  validate(facultyIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const departments = await facultyService.getDepartments(req.params.id);
    return sendSuccess(res, departments);
  })
);

/**
 * @route   GET /api/v1/faculties/:id/statistics
 * @desc    Get faculty statistics
 * @access  Private (faculties:read)
 */
router.get(
  '/:id/statistics',
  authorize('faculties:read'),
  validate(facultyIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const statistics = await facultyService.getFacultyStatistics(req.params.id);
    return sendSuccess(res, statistics);
  })
);

export default router;
