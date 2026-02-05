import { Router, type Router as RouterType } from 'express';
import { auditService } from '../services/audit.service.js';
import { authenticate, authorize } from '../middleware/index.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication and audit:read permission
router.use(authenticate);
router.use(authorize('audit:read'));

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Get audit logs with filters and pagination
 * @access  Private (audit:read)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      userId,
      action,
      resource,
      resourceId,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
    } = req.query;

    const result = await auditService.getAuditLogs({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      resourceId: resourceId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   GET /api/v1/audit-logs/statistics
 * @desc    Get audit log statistics
 * @access  Private (audit:read)
 */
router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const { dateFrom, dateTo } = req.query;

    const stats = await auditService.getStatistics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    return sendSuccess(res, stats);
  })
);

/**
 * @route   GET /api/v1/audit-logs/export
 * @desc    Export audit logs as CSV
 * @access  Private (audit:read)
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const {
      userId,
      action,
      resource,
      resourceId,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const csv = await auditService.exportAuditLogs({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      resourceId: resourceId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      search: search as string,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  })
);

/**
 * @route   GET /api/v1/audit-logs/entity/:resource/:resourceId
 * @desc    Get audit history for a specific entity
 * @access  Private (audit:read)
 */
router.get(
  '/entity/:resource/:resourceId',
  asyncHandler(async (req, res) => {
    const { resource, resourceId } = req.params;

    const history = await auditService.getEntityHistory(resource, resourceId);

    return sendSuccess(res, history);
  })
);

/**
 * @route   GET /api/v1/audit-logs/user/:userId
 * @desc    Get activity for a specific user
 * @access  Private (audit:read)
 */
router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const activity = await auditService.getUserActivity(
      userId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    return sendSuccess(res, activity);
  })
);

export default router;
