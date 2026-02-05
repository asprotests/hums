import { Router, type Router as RouterType } from 'express';
import { scheduleService } from '../services/schedule.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createScheduleSchema,
  updateScheduleSchema,
  scheduleQuerySchema,
  bulkScheduleSchema,
  copySchedulesSchema,
} from '../validators/schedule.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/schedules
 * @desc    Get schedules with filters
 * @access  Private (classes:read)
 */
router.get(
  '/',
  authorize('classes:read'),
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const schedules = await scheduleService.getSchedules(req.query as any);
    return sendSuccess(res, schedules);
  })
);

/**
 * @route   POST /api/v1/schedules
 * @desc    Create a new schedule
 * @access  Private (classes:create)
 */
router.post(
  '/',
  authorize('classes:create'),
  validate(createScheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await scheduleService.createSchedule(req.body, req.user?.userId);
    return sendCreated(res, schedule, 'Schedule created successfully');
  })
);

/**
 * @route   GET /api/v1/schedules/:id
 * @desc    Get schedule by ID
 * @access  Private (classes:read)
 */
router.get(
  '/:id',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    return sendSuccess(res, schedule);
  })
);

/**
 * @route   PATCH /api/v1/schedules/:id
 * @desc    Update schedule
 * @access  Private (classes:update)
 */
router.patch(
  '/:id',
  authorize('classes:update'),
  validate(updateScheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, schedule, 'Schedule updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/schedules/:id
 * @desc    Delete schedule
 * @access  Private (classes:delete)
 */
router.delete(
  '/:id',
  authorize('classes:delete'),
  asyncHandler(async (req, res) => {
    await scheduleService.deleteSchedule(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Schedule deleted successfully');
  })
);

/**
 * @route   GET /api/v1/schedules/class/:classId
 * @desc    Get schedules for a class
 * @access  Private (classes:read)
 */
router.get(
  '/class/:classId',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const schedules = await scheduleService.getClassSchedules(req.params.classId);
    return sendSuccess(res, schedules);
  })
);

/**
 * @route   POST /api/v1/schedules/class/:classId/bulk
 * @desc    Bulk create schedules for a class
 * @access  Private (classes:create)
 */
router.post(
  '/class/:classId/bulk',
  authorize('classes:create'),
  validate(bulkScheduleSchema),
  asyncHandler(async (req, res) => {
    const schedules = await scheduleService.bulkCreateSchedules(
      req.params.classId,
      req.body.schedules,
      req.user?.userId
    );
    return sendCreated(res, schedules, 'Schedules created successfully');
  })
);

/**
 * @route   POST /api/v1/schedules/class/:classId/copy
 * @desc    Copy schedules from this class to another
 * @access  Private (classes:create)
 */
router.post(
  '/class/:classId/copy',
  authorize('classes:create'),
  validate(copySchedulesSchema),
  asyncHandler(async (req, res) => {
    const result = await scheduleService.copySchedules(
      req.params.classId,
      req.body.targetClassId,
      req.user?.userId
    );
    return sendSuccess(res, result, 'Schedules copied');
  })
);

/**
 * @route   GET /api/v1/schedules/lecturer/:lecturerId
 * @desc    Get lecturer's weekly schedule
 * @access  Private (classes:read)
 */
router.get(
  '/lecturer/:lecturerId',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    if (!semesterId) {
      return sendSuccess(res, { schedules: [], byDay: [] });
    }
    const schedule = await scheduleService.getLecturerSchedule(
      req.params.lecturerId,
      semesterId as string
    );
    return sendSuccess(res, schedule);
  })
);

export default router;
