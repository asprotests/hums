import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { Prisma, RegistrationPeriodType } from '@hums/database';

export interface CreateRegistrationPeriodInput {
  semesterId: string;
  type: RegistrationPeriodType;
  startDate: Date;
  endDate: Date;
  lateFee?: number;
}

export interface UpdateRegistrationPeriodInput {
  type?: RegistrationPeriodType;
  startDate?: Date;
  endDate?: Date;
  lateFee?: number | null;
  isActive?: boolean;
}

export interface RegistrationPeriodFilters {
  semesterId?: string;
  type?: RegistrationPeriodType;
  isActive?: boolean;
}

export class RegistrationPeriodService {
  /**
   * Create a new registration period
   */
  async createPeriod(data: CreateRegistrationPeriodInput, userId?: string) {
    // Verify semester exists
    const semester = await prisma.semester.findUnique({
      where: { id: data.semesterId },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    // Check for overlapping periods of the same type
    const overlapping = await prisma.registrationPeriod.findFirst({
      where: {
        semesterId: data.semesterId,
        type: data.type,
        isActive: true,
        OR: [
          {
            startDate: { lte: data.startDate },
            endDate: { gte: data.startDate },
          },
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.endDate },
          },
          {
            startDate: { gte: data.startDate },
            endDate: { lte: data.endDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw AppError.conflict(`An active ${data.type} registration period already exists for this time range`);
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
      throw AppError.badRequest('End date must be after start date');
    }

    const period = await prisma.registrationPeriod.create({
      data: {
        semesterId: data.semesterId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        lateFee: data.lateFee,
      },
      include: {
        semester: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'RegistrationPeriod',
      resourceId: period.id,
      newValues: period,
    });

    return period;
  }

  /**
   * Get registration periods with filters
   */
  async getPeriods(filters: RegistrationPeriodFilters = {}) {
    const { semesterId, type, isActive } = filters;

    const where: Prisma.RegistrationPeriodWhereInput = {};

    if (semesterId) {
      where.semesterId = semesterId;
    }

    if (type) {
      where.type = type;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const periods = await prisma.registrationPeriod.findMany({
      where,
      include: {
        semester: true,
      },
      orderBy: [{ startDate: 'desc' }],
    });

    return periods;
  }

  /**
   * Get registration period by ID
   */
  async getPeriodById(id: string) {
    const period = await prisma.registrationPeriod.findUnique({
      where: { id },
      include: {
        semester: true,
      },
    });

    if (!period) {
      throw AppError.notFound('Registration period not found');
    }

    return period;
  }

  /**
   * Update registration period
   */
  async updatePeriod(id: string, data: UpdateRegistrationPeriodInput, userId?: string) {
    const period = await this.getPeriodById(id);

    // Validate dates if being updated
    const startDate = data.startDate || period.startDate;
    const endDate = data.endDate || period.endDate;

    if (startDate >= endDate) {
      throw AppError.badRequest('End date must be after start date');
    }

    const updated = await prisma.registrationPeriod.update({
      where: { id },
      data: {
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        lateFee: data.lateFee,
        isActive: data.isActive,
      },
      include: {
        semester: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'RegistrationPeriod',
      resourceId: id,
      oldValues: period,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Delete registration period
   */
  async deletePeriod(id: string, userId?: string) {
    const period = await this.getPeriodById(id);

    await prisma.registrationPeriod.delete({
      where: { id },
    });

    await auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'RegistrationPeriod',
      resourceId: id,
      oldValues: period,
    });

    return { deleted: true };
  }

  /**
   * Get current active registration period for a semester
   */
  async getCurrentPeriod(semesterId: string) {
    const now = new Date();

    const period = await prisma.registrationPeriod.findFirst({
      where: {
        semesterId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        semester: true,
      },
      orderBy: { type: 'asc' }, // REGULAR before LATE before DROP_ADD
    });

    return period;
  }

  /**
   * Check if registration is open for a semester
   */
  async isRegistrationOpen(semesterId: string): Promise<{
    isOpen: boolean;
    period?: {
      id: string;
      type: RegistrationPeriodType;
      endDate: Date;
      lateFee: number | null;
    };
    message: string;
  }> {
    const currentPeriod = await this.getCurrentPeriod(semesterId);

    if (!currentPeriod) {
      // Check if registration hasn't started yet
      const upcomingPeriod = await prisma.registrationPeriod.findFirst({
        where: {
          semesterId,
          isActive: true,
          startDate: { gt: new Date() },
        },
        orderBy: { startDate: 'asc' },
      });

      if (upcomingPeriod) {
        return {
          isOpen: false,
          message: `Registration opens on ${upcomingPeriod.startDate.toLocaleDateString()}`,
        };
      }

      return {
        isOpen: false,
        message: 'No active registration period',
      };
    }

    const typeLabel = {
      REGULAR: 'Regular registration',
      LATE: 'Late registration',
      DROP_ADD: 'Drop/Add period',
    };

    return {
      isOpen: true,
      period: {
        id: currentPeriod.id,
        type: currentPeriod.type,
        endDate: currentPeriod.endDate,
        lateFee: currentPeriod.lateFee ? Number(currentPeriod.lateFee) : null,
      },
      message: `${typeLabel[currentPeriod.type]} is open until ${currentPeriod.endDate.toLocaleDateString()}`,
    };
  }

  /**
   * Get registration status summary for current semester
   */
  async getRegistrationStatus() {
    // Find current semester
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    if (!currentSemester) {
      return {
        semester: null,
        isOpen: false,
        message: 'No current semester set',
      };
    }

    const status = await this.isRegistrationOpen(currentSemester.id);

    return {
      semester: {
        id: currentSemester.id,
        name: currentSemester.name,
      },
      ...status,
    };
  }
}

export const registrationPeriodService = new RegistrationPeriodService();
