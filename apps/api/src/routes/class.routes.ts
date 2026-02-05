import { Router, type Router as RouterType } from 'express';
import { classService } from '../services/class.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createClassSchema,
  updateClassSchema,
  classQuerySchema,
  cancelClassSchema,
  assignLecturerSchema,
  assignRoomSchema,
} from '../validators/class.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/classes
 * @desc    Get all classes with filters
 * @access  Private (classes:read)
 */
router.get(
  '/',
  authorize('classes:read'),
  validate(classQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await classService.getClasses(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/classes
 * @desc    Create a new class
 * @access  Private (classes:create)
 */
router.post(
  '/',
  authorize('classes:create'),
  validate(createClassSchema),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.createClass(req.body, req.user?.userId);
    return sendCreated(res, classEntity, 'Class created successfully');
  })
);

/**
 * @route   GET /api/v1/classes/:id
 * @desc    Get class by ID
 * @access  Private (classes:read)
 */
router.get(
  '/:id',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.getClassById(req.params.id);
    return sendSuccess(res, classEntity);
  })
);

/**
 * @route   PATCH /api/v1/classes/:id
 * @desc    Update class
 * @access  Private (classes:update)
 */
router.patch(
  '/:id',
  authorize('classes:update'),
  validate(updateClassSchema),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.updateClass(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, classEntity, 'Class updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/classes/:id
 * @desc    Delete class
 * @access  Private (classes:delete)
 */
router.delete(
  '/:id',
  authorize('classes:delete'),
  asyncHandler(async (req, res) => {
    await classService.deleteClass(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Class deleted successfully');
  })
);

/**
 * @route   POST /api/v1/classes/:id/cancel
 * @desc    Cancel class
 * @access  Private (classes:update)
 */
router.post(
  '/:id/cancel',
  authorize('classes:update'),
  validate(cancelClassSchema),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.cancelClass(
      req.params.id,
      req.body.reason,
      req.user?.userId
    );
    return sendSuccess(res, classEntity, 'Class cancelled successfully');
  })
);

/**
 * @route   POST /api/v1/classes/:id/close
 * @desc    Close class for new enrollments
 * @access  Private (classes:update)
 */
router.post(
  '/:id/close',
  authorize('classes:update'),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.closeClass(req.params.id, req.user?.userId);
    return sendSuccess(res, classEntity, 'Class closed successfully');
  })
);

/**
 * @route   POST /api/v1/classes/:id/reopen
 * @desc    Reopen class for enrollments
 * @access  Private (classes:update)
 */
router.post(
  '/:id/reopen',
  authorize('classes:update'),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.reopenClass(req.params.id, req.user?.userId);
    return sendSuccess(res, classEntity, 'Class reopened successfully');
  })
);

/**
 * @route   POST /api/v1/classes/:id/split
 * @desc    Split class into a new section
 * @access  Private (classes:create)
 */
router.post(
  '/:id/split',
  authorize('classes:create'),
  asyncHandler(async (req, res) => {
    const newClass = await classService.splitClass(req.params.id, req.user?.userId);
    return sendCreated(res, newClass, 'Class split successfully');
  })
);

/**
 * @route   PATCH /api/v1/classes/:id/lecturer
 * @desc    Assign lecturer to class
 * @access  Private (classes:update)
 */
router.patch(
  '/:id/lecturer',
  authorize('classes:update'),
  validate(assignLecturerSchema),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.assignLecturer(
      req.params.id,
      req.body.lecturerId,
      req.user?.userId
    );
    return sendSuccess(res, classEntity, 'Lecturer assigned successfully');
  })
);

/**
 * @route   PATCH /api/v1/classes/:id/room
 * @desc    Assign room to class
 * @access  Private (classes:update)
 */
router.patch(
  '/:id/room',
  authorize('classes:update'),
  validate(assignRoomSchema),
  asyncHandler(async (req, res) => {
    const classEntity = await classService.assignRoom(
      req.params.id,
      req.body.roomId,
      req.user?.userId
    );
    return sendSuccess(res, classEntity, 'Room assigned successfully');
  })
);

/**
 * @route   GET /api/v1/classes/:id/students
 * @desc    Get students enrolled in class
 * @access  Private (classes:read)
 */
router.get(
  '/:id/students',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const students = await classService.getClassStudents(req.params.id);
    return sendSuccess(res, students);
  })
);

export default router;
