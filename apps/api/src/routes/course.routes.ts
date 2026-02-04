import { Router, type Router as RouterType } from 'express';
import { courseService } from '../services/course.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  courseIdSchema,
  addPrerequisiteSchema,
  prerequisiteIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/courses
 * @desc    Get all courses with pagination and filters
 * @access  Private (courses:read)
 */
router.get(
  '/',
  authorize('courses:read'),
  validate(courseQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await courseService.getCourses(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/courses
 * @desc    Create a new course
 * @access  Private (courses:create)
 */
router.post(
  '/',
  authorize('courses:create'),
  validate(createCourseSchema),
  asyncHandler(async (req, res) => {
    const course = await courseService.createCourse(req.body, req.user?.userId);
    return sendCreated(res, course, 'Course created successfully');
  })
);

/**
 * @route   GET /api/v1/courses/:id
 * @desc    Get course by ID
 * @access  Private (courses:read)
 */
router.get(
  '/:id',
  authorize('courses:read'),
  validate(courseIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const course = await courseService.getCourseById(req.params.id);
    return sendSuccess(res, course);
  })
);

/**
 * @route   PATCH /api/v1/courses/:id
 * @desc    Update course
 * @access  Private (courses:update)
 */
router.patch(
  '/:id',
  authorize('courses:update'),
  validate(courseIdSchema, 'params'),
  validate(updateCourseSchema),
  asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, course, 'Course updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/courses/:id
 * @desc    Delete course (soft delete)
 * @access  Private (courses:delete)
 */
router.delete(
  '/:id',
  authorize('courses:delete'),
  validate(courseIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await courseService.deleteCourse(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   POST /api/v1/courses/:id/prerequisites
 * @desc    Add prerequisite to course
 * @access  Private (courses:update)
 */
router.post(
  '/:id/prerequisites',
  authorize('courses:update'),
  validate(courseIdSchema, 'params'),
  validate(addPrerequisiteSchema),
  asyncHandler(async (req, res) => {
    const result = await courseService.addPrerequisite(req.params.id, req.body.prerequisiteId, req.user?.userId);
    return sendCreated(res, result, result.message);
  })
);

/**
 * @route   DELETE /api/v1/courses/:id/prerequisites/:prereqId
 * @desc    Remove prerequisite from course
 * @access  Private (courses:update)
 */
router.delete(
  '/:id/prerequisites/:prereqId',
  authorize('courses:update'),
  validate(prerequisiteIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await courseService.removePrerequisite(req.params.id, req.params.prereqId, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/courses/:id/classes
 * @desc    Get classes for a course
 * @access  Private (courses:read)
 */
router.get(
  '/:id/classes',
  authorize('courses:read'),
  validate(courseIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const semesterId = req.query.semesterId as string | undefined;
    const classes = await courseService.getClasses(req.params.id, semesterId);
    return sendSuccess(res, classes);
  })
);

/**
 * @route   GET /api/v1/courses/:id/prerequisites-chain
 * @desc    Get full prerequisite chain for a course
 * @access  Private (courses:read)
 */
router.get(
  '/:id/prerequisites-chain',
  authorize('courses:read'),
  validate(courseIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const chain = await courseService.getPrerequisiteChain(req.params.id);
    return sendSuccess(res, chain);
  })
);

export default router;
