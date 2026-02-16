import { Router, type Router as RouterType } from 'express';
import { notificationService } from '../services/notification.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createNotificationSchema,
  bulkNotificationSchema,
  roleNotificationSchema,
  notificationQuerySchema,
} from '../validators/email.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// User Notification Routes (Self-service)
// ============================================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get current user's notifications
 * @access  Private
 */
router.get(
  '/',
  validate(notificationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const result = await notificationService.getUserNotifications(userId, req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);
    return sendSuccess(res, { count });
  })
);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const notification = await notificationService.markAsRead(req.params.id, userId);
    return sendSuccess(res, notification, 'Notification marked as read');
  })
);

/**
 * @route   POST /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post(
  '/mark-all-read',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const count = await notificationService.markAllAsRead(userId);
    return sendSuccess(res, { count }, `${count} notifications marked as read`);
  })
);

/**
 * @route   DELETE /api/v1/notifications/clear-all
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete(
  '/clear-all',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const count = await notificationService.clearAllNotifications(userId);
    return sendSuccess(res, { count }, `${count} notifications cleared`);
  })
);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    await notificationService.deleteNotification(req.params.id, userId);
    return sendSuccess(res, null, 'Notification deleted');
  })
);

// ============================================
// Admin Notification Routes
// ============================================

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send notification to a user
 * @access  Private (settings:create)
 */
router.post(
  '/send',
  authorize('settings:create'),
  validate(createNotificationSchema),
  asyncHandler(async (req, res) => {
    const notification = await notificationService.createNotification(req.body);
    return sendCreated(res, notification, 'Notification sent');
  })
);

/**
 * @route   POST /api/v1/notifications/send-bulk
 * @desc    Send notification to multiple users
 * @access  Private (settings:create)
 */
router.post(
  '/send-bulk',
  authorize('settings:create'),
  validate(bulkNotificationSchema),
  asyncHandler(async (req, res) => {
    const { userIds, ...notification } = req.body;
    const result = await notificationService.notifyMany(userIds, notification);
    return sendCreated(res, result, `Notification sent to ${userIds.length} users`);
  })
);

/**
 * @route   POST /api/v1/notifications/send-to-role
 * @desc    Send notification to all users with a specific role
 * @access  Private (settings:create)
 */
router.post(
  '/send-to-role',
  authorize('settings:create'),
  validate(roleNotificationSchema),
  asyncHandler(async (req, res) => {
    const { roleName, ...notification } = req.body;
    const result = await notificationService.notifyByRole(roleName, notification);
    return sendCreated(res, result, `Notification sent to users with role: ${roleName}`);
  })
);

/**
 * @route   POST /api/v1/notifications/cleanup
 * @desc    Cleanup old notifications
 * @access  Private (settings:delete)
 */
router.post(
  '/cleanup',
  authorize('settings:delete'),
  asyncHandler(async (req, res) => {
    const daysToKeep = parseInt(req.query.daysToKeep as string) || 90;
    const count = await notificationService.cleanupOldNotifications(daysToKeep);
    return sendSuccess(res, { count }, `${count} old notifications removed`);
  })
);

export default router;
