import { Router, type Router as RouterType } from 'express';
import { programService } from '../services/program.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createProgramSchema,
  updateProgramSchema,
  programQuerySchema,
  programIdSchema,
  addCurriculumCourseSchema,
  curriculumCourseIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/programs
 * @desc    Get all programs with pagination and filters
 * @access  Private (programs:read)
 */
router.get(
  '/',
  authorize('programs:read'),
  validate(programQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await programService.getPrograms(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/programs
 * @desc    Create a new program
 * @access  Private (programs:create)
 */
router.post(
  '/',
  authorize('programs:create'),
  validate(createProgramSchema),
  asyncHandler(async (req, res) => {
    const program = await programService.createProgram(req.body, req.user?.userId);
    return sendCreated(res, program, 'Program created successfully');
  })
);

/**
 * @route   GET /api/v1/programs/:id
 * @desc    Get program by ID
 * @access  Private (programs:read)
 */
router.get(
  '/:id',
  authorize('programs:read'),
  validate(programIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const program = await programService.getProgramById(req.params.id);
    return sendSuccess(res, program);
  })
);

/**
 * @route   PATCH /api/v1/programs/:id
 * @desc    Update program
 * @access  Private (programs:update)
 */
router.patch(
  '/:id',
  authorize('programs:update'),
  validate(programIdSchema, 'params'),
  validate(updateProgramSchema),
  asyncHandler(async (req, res) => {
    const program = await programService.updateProgram(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, program, 'Program updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/programs/:id
 * @desc    Delete program (soft delete)
 * @access  Private (programs:delete)
 */
router.delete(
  '/:id',
  authorize('programs:delete'),
  validate(programIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await programService.deleteProgram(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/programs/:id/curriculum
 * @desc    Get curriculum for a program
 * @access  Private (programs:read)
 */
router.get(
  '/:id/curriculum',
  authorize('programs:read'),
  validate(programIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const curriculum = await programService.getCurriculum(req.params.id);
    return sendSuccess(res, curriculum);
  })
);

/**
 * @route   POST /api/v1/programs/:id/curriculum
 * @desc    Add course to program curriculum
 * @access  Private (programs:update)
 */
router.post(
  '/:id/curriculum',
  authorize('programs:update'),
  validate(programIdSchema, 'params'),
  validate(addCurriculumCourseSchema),
  asyncHandler(async (req, res) => {
    const course = await programService.addCurriculumCourse(req.params.id, req.body, req.user?.userId);
    return sendCreated(res, course, 'Course added to curriculum successfully');
  })
);

/**
 * @route   DELETE /api/v1/programs/:id/curriculum/:courseId
 * @desc    Remove course from program curriculum
 * @access  Private (programs:update)
 */
router.delete(
  '/:id/curriculum/:courseId',
  authorize('programs:update'),
  validate(curriculumCourseIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await programService.removeCurriculumCourse(req.params.id, req.params.courseId, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/programs/:id/students
 * @desc    Get students for a program
 * @access  Private (programs:read)
 */
router.get(
  '/:id/students',
  authorize('programs:read'),
  validate(programIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await programService.getStudents(req.params.id, page, limit);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/programs/:id/statistics
 * @desc    Get program statistics
 * @access  Private (programs:read)
 */
router.get(
  '/:id/statistics',
  authorize('programs:read'),
  validate(programIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const statistics = await programService.getProgramStatistics(req.params.id);
    return sendSuccess(res, statistics);
  })
);

export default router;
