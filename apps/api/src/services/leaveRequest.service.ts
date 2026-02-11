import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import { leaveBalanceService } from './leaveBalance.service.js';
import type { LeaveStatus, Prisma } from '@hums/database';

export interface CreateLeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
}

export interface LeaveRequestFilters {
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface LeaveRequestWithDetails {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  documentUrl: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approverRemarks: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  employee: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
    department: {
      id: string;
      name: string;
    } | null;
  };
  leaveType: {
    id: string;
    name: string;
    nameLocal: string | null;
    isPaid: boolean;
    requiresDocument: boolean;
  };
  approver?: {
    firstName: string;
    lastName: string;
  } | null;
}

export class LeaveRequestService {
  /**
   * Calculate business days between two dates (excludes weekends)
   */
  calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday - adjust based on Somalia work week (Fri-Sat off)
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Check for overlapping leave requests
   */
  async checkConflicts(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ): Promise<boolean> {
    const where: Prisma.LeaveRequestWhereInput = {
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    };

    if (excludeRequestId) {
      where.id = { not: excludeRequestId };
    }

    const conflicts = await prisma.leaveRequest.count({ where });
    return conflicts > 0;
  }

  /**
   * Submit a new leave request
   */
  async submitRequest(
    employeeId: string,
    data: CreateLeaveRequestInput,
    userId: string
  ): Promise<LeaveRequestWithDetails> {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate dates
    if (startDate > endDate) {
      throw AppError.badRequest('Start date must be before or equal to end date');
    }

    // Check leave type exists and get its details
    const leaveType = await prisma.leaveTypeConfig.findUnique({
      where: { id: data.leaveTypeId },
    });

    if (!leaveType) {
      throw AppError.notFound('Leave type not found');
    }

    if (!leaveType.isActive) {
      throw AppError.badRequest('This leave type is not active');
    }

    // Check if document is required
    if (leaveType.requiresDocument && !data.documentUrl) {
      throw AppError.badRequest('Document is required for this leave type');
    }

    // Check for conflicts
    const hasConflict = await this.checkConflicts(employeeId, startDate, endDate);
    if (hasConflict) {
      throw AppError.badRequest('You already have a leave request for this period');
    }

    // Calculate total days
    const totalDays = this.calculateBusinessDays(startDate, endDate);

    if (totalDays <= 0) {
      throw AppError.badRequest('Leave request must include at least one business day');
    }

    // Check balance
    const year = startDate.getFullYear();
    const balance = await leaveBalanceService.getBalance(employeeId, data.leaveTypeId, year);

    if (balance) {
      const available = balance.allocated + balance.carriedForward - balance.used;
      // Get pending days
      const pendingRequests = await prisma.leaveRequest.aggregate({
        where: {
          employeeId,
          leaveTypeId: data.leaveTypeId,
          status: 'PENDING',
          startDate: { gte: new Date(`${year}-01-01`) },
        },
        _sum: { totalDays: true },
      });

      const pending = pendingRequests._sum.totalDays || 0;
      const actualAvailable = available - pending;

      if (totalDays > actualAvailable) {
        throw AppError.badRequest(
          `Insufficient leave balance. Available: ${actualAvailable} days`
        );
      }
    }

    // Create the request
    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: data.reason,
        documentUrl: data.documentUrl,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
            requiresDocument: true,
          },
        },
      },
    });

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'LeaveRequest',
      resourceId: request.id,
      userId,
      newValues: { ...data, totalDays },
    });

    return request as LeaveRequestWithDetails;
  }

  /**
   * Get leave requests with filters and pagination
   */
  async getRequests(
    filters: LeaveRequestFilters,
    page: number = 1,
    limit: number = 20
  ) {
    const where: Prisma.LeaveRequestWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.leaveTypeId) {
      where.leaveTypeId = filters.leaveTypeId;
    }
    if (filters.startDate) {
      where.startDate = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.endDate = { lte: new Date(filters.endDate) };
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              user: { select: { firstName: true, lastName: true } },
              department: { select: { id: true, name: true } },
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              isPaid: true,
              requiresDocument: true,
            },
          },
          approver: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get leave request by ID
   */
  async getRequestById(id: string): Promise<LeaveRequestWithDetails> {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
            requiresDocument: true,
          },
        },
        approver: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!request) {
      throw AppError.notFound('Leave request not found');
    }

    return request as LeaveRequestWithDetails;
  }

  /**
   * Get employee's leave requests
   */
  async getEmployeeRequests(employeeId: string, year?: number) {
    const where: Prisma.LeaveRequestWhereInput = { employeeId };

    if (year) {
      where.startDate = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    return prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
          },
        },
        approver: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending approvals for a supervisor/HOD
   */
  async getPendingApprovals(_approverId: string, departmentId?: string) {
    const where: Prisma.LeaveRequestWhereInput = {
      status: 'PENDING',
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    return prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
            requiresDocument: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve a leave request
   */
  async approveRequest(requestId: string, approverId: string, remarks?: string) {
    const request = await this.getRequestById(requestId);

    if (request.status !== 'PENDING') {
      throw AppError.badRequest('Only pending requests can be approved');
    }

    // Deduct from balance
    const year = new Date(request.startDate).getFullYear();
    await leaveBalanceService.deductLeave(
      request.employeeId,
      request.leaveTypeId,
      year,
      request.totalDays,
      approverId
    );

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approverId,
        approverRemarks: remarks,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
            requiresDocument: true,
          },
        },
        approver: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveRequest',
      resourceId: requestId,
      userId: approverId,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED', remarks },
    });

    return updated;
  }

  /**
   * Reject a leave request
   */
  async rejectRequest(requestId: string, approverId: string, remarks: string) {
    const request = await this.getRequestById(requestId);

    if (request.status !== 'PENDING') {
      throw AppError.badRequest('Only pending requests can be rejected');
    }

    if (!remarks) {
      throw AppError.badRequest('Remarks are required when rejecting a request');
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approverId,
        approverRemarks: remarks,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            isPaid: true,
            requiresDocument: true,
          },
        },
        approver: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveRequest',
      resourceId: requestId,
      userId: approverId,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'REJECTED', remarks },
    });

    return updated;
  }

  /**
   * Cancel a leave request
   */
  async cancelRequest(requestId: string, userId: string) {
    const request = await this.getRequestById(requestId);

    if (request.status === 'CANCELLED') {
      throw AppError.badRequest('Request is already cancelled');
    }

    // If approved, restore the balance
    if (request.status === 'APPROVED') {
      const year = new Date(request.startDate).getFullYear();
      await leaveBalanceService.restoreLeave(
        request.employeeId,
        request.leaveTypeId,
        year,
        request.totalDays,
        userId
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveRequest',
      resourceId: requestId,
      userId,
      oldValues: { status: request.status },
      newValues: { status: 'CANCELLED' },
    });

    return updated;
  }

  /**
   * Get leave calendar for a month
   */
  async getLeaveCalendar(month: number, year: number, departmentId?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const where: Prisma.LeaveRequestWhereInput = {
      status: 'APPROVED',
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return leaves;
  }
}

export const leaveRequestService = new LeaveRequestService();
