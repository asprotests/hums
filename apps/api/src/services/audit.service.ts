import { prisma } from '@hums/database';
import type { Prisma } from '@hums/database';

// Audit action types
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export interface AuditLogEntry {
  userId?: string | null;
  action: AuditAction | string;
  resource: string;
  resourceId?: string | null;
  oldValues?: object | null;
  newValues?: object | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          oldValues: entry.oldValues as Prisma.InputJsonValue,
          newValues: entry.newValues as Prisma.InputJsonValue,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getAuditLogs(filters: AuditFilters) {
    const {
      userId,
      action,
      resource,
      resourceId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    if (search) {
      where.OR = [
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get history for a specific entity
   */
  async getEntityHistory(resource: string, resourceId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  /**
   * Get activity for a specific user
   */
  async getUserActivity(userId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.AuditLogWhereInput = { userId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent activity
    });

    return logs;
  }

  /**
   * Export audit logs to CSV format
   */
  async exportAuditLogs(filters: AuditFilters): Promise<string> {
    // Get all logs matching filters (no pagination for export)
    const { data: logs } = await this.getAuditLogs({
      ...filters,
      page: 1,
      limit: 10000, // Max export limit
    });

    // CSV header
    const header = [
      'Timestamp',
      'User',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'User Agent',
    ].join(',');

    // CSV rows
    const rows = logs.map((log) => {
      const user = log.user
        ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})`
        : 'System';
      return [
        log.createdAt.toISOString(),
        `"${user}"`,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.AuditLogWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const [totalLogs, actionCounts, resourceCounts, recentLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: { resource: true },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalLogs,
      last24Hours: recentLogs,
      byAction: actionCounts.reduce(
        (acc, item) => {
          acc[item.action] = item._count.action;
          return acc;
        },
        {} as Record<string, number>
      ),
      byResource: resourceCounts.reduce(
        (acc, item) => {
          acc[item.resource] = item._count.resource;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

export const auditService = new AuditService();
