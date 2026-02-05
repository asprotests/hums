import { Router, type Router as RouterType } from 'express';
import { roomService } from '../services/room.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createRoomSchema,
  updateRoomSchema,
  roomQuerySchema,
  checkAvailabilitySchema,
} from '../validators/room.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/rooms
 * @desc    Get all rooms with filters
 * @access  Private (classes:read)
 */
router.get(
  '/',
  authorize('classes:read'),
  validate(roomQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await roomService.getRooms(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/rooms/buildings
 * @desc    Get unique building names
 * @access  Private (classes:read)
 */
router.get(
  '/buildings',
  authorize('classes:read'),
  asyncHandler(async (_req, res) => {
    const buildings = await roomService.getBuildings();
    return sendSuccess(res, buildings);
  })
);

/**
 * @route   POST /api/v1/rooms
 * @desc    Create a new room
 * @access  Private (classes:create)
 */
router.post(
  '/',
  authorize('classes:create'),
  validate(createRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await roomService.createRoom(req.body, req.user?.userId);
    return sendCreated(res, room, 'Room created successfully');
  })
);

/**
 * @route   GET /api/v1/rooms/:id
 * @desc    Get room by ID
 * @access  Private (classes:read)
 */
router.get(
  '/:id',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const room = await roomService.getRoomById(req.params.id);
    return sendSuccess(res, room);
  })
);

/**
 * @route   PATCH /api/v1/rooms/:id
 * @desc    Update room
 * @access  Private (classes:update)
 */
router.patch(
  '/:id',
  authorize('classes:update'),
  validate(updateRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await roomService.updateRoom(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, room, 'Room updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/rooms/:id
 * @desc    Delete room
 * @access  Private (classes:delete)
 */
router.delete(
  '/:id',
  authorize('classes:delete'),
  asyncHandler(async (req, res) => {
    await roomService.deleteRoom(req.params.id, req.user?.userId);
    return sendSuccess(res, null, 'Room deleted successfully');
  })
);

/**
 * @route   GET /api/v1/rooms/:id/availability
 * @desc    Check room availability for a time slot
 * @access  Private (classes:read)
 */
router.get(
  '/:id/availability',
  authorize('classes:read'),
  validate(checkAvailabilitySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { day, start, end } = req.query as { day: string; start: string; end: string };
    const result = await roomService.checkRoomAvailability(
      req.params.id,
      parseInt(day, 10),
      start,
      end
    );
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/rooms/:id/schedule
 * @desc    Get room schedule for a semester
 * @access  Private (classes:read)
 */
router.get(
  '/:id/schedule',
  authorize('classes:read'),
  asyncHandler(async (req, res) => {
    const { semesterId } = req.query;
    if (!semesterId) {
      return sendSuccess(res, []);
    }
    const schedules = await roomService.getRoomSchedule(req.params.id, semesterId as string);
    return sendSuccess(res, schedules);
  })
);

export default router;
