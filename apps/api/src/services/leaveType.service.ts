import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { LeaveTypeEnum } from '@hums/database';

export interface CreateLeaveTypeInput {
  name: string;
  nameLocal?: string;
  type: LeaveTypeEnum;
  daysPerYear: number;
  carryForward?: boolean;
  maxCarryDays?: number;
  requiresDocument?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
}

export interface UpdateLeaveTypeInput {
  name?: string;
  nameLocal?: string;
  daysPerYear?: number;
  carryForward?: boolean;
  maxCarryDays?: number;
  requiresDocument?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
}

export class LeaveTypeService {
  /**
   * Get all leave types
   */
  async getLeaveTypes(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    return prisma.leaveTypeConfig.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get leave type by ID
   */
  async getLeaveTypeById(id: string) {
    const leaveType = await prisma.leaveTypeConfig.findUnique({
      where: { id },
    });

    if (!leaveType) {
      throw AppError.notFound('Leave type not found');
    }

    return leaveType;
  }

  /**
   * Create a new leave type
   */
  async createLeaveType(data: CreateLeaveTypeInput, userId: string) {
    // Check for duplicate name
    const existing = await prisma.leaveTypeConfig.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw AppError.badRequest('Leave type with this name already exists');
    }

    const leaveType = await prisma.leaveTypeConfig.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        type: data.type,
        daysPerYear: data.daysPerYear,
        carryForward: data.carryForward ?? false,
        maxCarryDays: data.maxCarryDays ?? 0,
        requiresDocument: data.requiresDocument ?? false,
        isPaid: data.isPaid ?? true,
        isActive: data.isActive ?? true,
      },
    });

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'LeaveTypeConfig',
      resourceId: leaveType.id,
      userId,
      newValues: data,
    });

    return leaveType;
  }

  /**
   * Update a leave type
   */
  async updateLeaveType(id: string, data: UpdateLeaveTypeInput, userId: string) {
    const existing = await this.getLeaveTypeById(id);

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.leaveTypeConfig.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw AppError.badRequest('Leave type with this name already exists');
      }
    }

    const leaveType = await prisma.leaveTypeConfig.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        daysPerYear: data.daysPerYear,
        carryForward: data.carryForward,
        maxCarryDays: data.maxCarryDays,
        requiresDocument: data.requiresDocument,
        isPaid: data.isPaid,
        isActive: data.isActive,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveTypeConfig',
      resourceId: id,
      userId,
      oldValues: { name: existing.name },
      newValues: data,
    });

    return leaveType;
  }

  /**
   * Initialize default leave types if none exist
   */
  async initializeDefaultTypes(userId: string) {
    const count = await prisma.leaveTypeConfig.count();
    if (count > 0) {
      return; // Already initialized
    }

    const defaultTypes: CreateLeaveTypeInput[] = [
      {
        name: 'Annual Leave',
        nameLocal: 'Fasax Sanadeedka',
        type: 'ANNUAL',
        daysPerYear: 21,
        isPaid: true,
        carryForward: true,
        maxCarryDays: 5,
      },
      {
        name: 'Sick Leave',
        nameLocal: 'Fasax Jiro',
        type: 'SICK',
        daysPerYear: 14,
        isPaid: true,
        requiresDocument: true,
      },
      {
        name: 'Maternity Leave',
        nameLocal: 'Fasax Umuliso',
        type: 'MATERNITY',
        daysPerYear: 90,
        isPaid: true,
      },
      {
        name: 'Paternity Leave',
        nameLocal: 'Fasax Aabe',
        type: 'PATERNITY',
        daysPerYear: 7,
        isPaid: true,
      },
      {
        name: 'Unpaid Leave',
        nameLocal: 'Fasax Aan Mushaar Lahayn',
        type: 'UNPAID',
        daysPerYear: 30,
        isPaid: false,
      },
      {
        name: 'Compassionate Leave',
        nameLocal: 'Fasax Tacsiyad',
        type: 'COMPASSIONATE',
        daysPerYear: 5,
        isPaid: true,
      },
    ];

    for (const type of defaultTypes) {
      await this.createLeaveType(type, userId);
    }
  }
}

export const leaveTypeService = new LeaveTypeService();
