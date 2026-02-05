import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { HoldType } from '@hums/database';

export interface CreateHoldInput {
  studentId: string;
  type: HoldType;
  reason: string;
  blocksRegistration?: boolean;
  blocksGrades?: boolean;
  blocksTranscript?: boolean;
}

export interface UpdateHoldInput {
  reason?: string;
  blocksRegistration?: boolean;
  blocksGrades?: boolean;
  blocksTranscript?: boolean;
}

export interface HoldFilters {
  studentId?: string;
  type?: HoldType;
  isActive?: boolean;
}

export class HoldService {
  /**
   * Place a hold on a student
   */
  async createHold(data: CreateHoldInput, placedById: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Check for existing active hold of same type
    const existingHold = await prisma.hold.findFirst({
      where: {
        studentId: data.studentId,
        type: data.type,
        releasedAt: null,
      },
    });

    if (existingHold) {
      throw AppError.conflict(`Student already has an active ${data.type} hold`);
    }

    const hold = await prisma.hold.create({
      data: {
        studentId: data.studentId,
        type: data.type,
        reason: data.reason,
        placedById,
        blocksRegistration: data.blocksRegistration ?? true,
        blocksGrades: data.blocksGrades ?? false,
        blocksTranscript: data.blocksTranscript ?? false,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        placedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await auditService.log({
      userId: placedById,
      action: AuditAction.CREATE,
      resource: 'Hold',
      resourceId: hold.id,
      newValues: hold,
    });

    return hold;
  }

  /**
   * Get holds with filters
   */
  async getHolds(filters: HoldFilters = {}) {
    const { studentId, type, isActive } = filters;

    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (type) {
      where.type = type;
    }

    if (typeof isActive === 'boolean') {
      if (isActive) {
        where.releasedAt = null;
      } else {
        where.releasedAt = { not: null };
      }
    }

    const holds = await prisma.hold.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        placedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        releasedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return holds;
  }

  /**
   * Get hold by ID
   */
  async getHoldById(id: string) {
    const hold = await prisma.hold.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        placedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        releasedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!hold) {
      throw AppError.notFound('Hold not found');
    }

    return hold;
  }

  /**
   * Update a hold
   */
  async updateHold(id: string, data: UpdateHoldInput, userId: string) {
    const hold = await this.getHoldById(id);

    if (hold.releasedAt) {
      throw AppError.badRequest('Cannot update a released hold');
    }

    const updated = await prisma.hold.update({
      where: { id },
      data: {
        reason: data.reason,
        blocksRegistration: data.blocksRegistration,
        blocksGrades: data.blocksGrades,
        blocksTranscript: data.blocksTranscript,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        placedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Hold',
      resourceId: id,
      oldValues: hold,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Release a hold
   */
  async releaseHold(id: string, releasedById: string) {
    const hold = await this.getHoldById(id);

    if (hold.releasedAt) {
      throw AppError.badRequest('Hold is already released');
    }

    const updated = await prisma.hold.update({
      where: { id },
      data: {
        releasedAt: new Date(),
        releasedById,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        placedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        releasedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await auditService.log({
      userId: releasedById,
      action: AuditAction.UPDATE,
      resource: 'Hold',
      resourceId: id,
      oldValues: hold,
      newValues: { ...updated, releaseNote: 'Hold released' },
    });

    return updated;
  }

  /**
   * Get all active holds for a student
   */
  async getStudentActiveHolds(studentId: string) {
    const holds = await prisma.hold.findMany({
      where: {
        studentId,
        releasedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return holds;
  }

  /**
   * Check if student has any holds blocking registration
   */
  async hasRegistrationHold(studentId: string): Promise<{
    hasHold: boolean;
    holds: Array<{ type: HoldType; reason: string }>;
  }> {
    const holds = await prisma.hold.findMany({
      where: {
        studentId,
        releasedAt: null,
        blocksRegistration: true,
      },
    });

    return {
      hasHold: holds.length > 0,
      holds: holds.map((h) => ({ type: h.type, reason: h.reason })),
    };
  }

  /**
   * Check if student has any holds blocking transcript
   */
  async hasTranscriptHold(studentId: string): Promise<{
    hasHold: boolean;
    holds: Array<{ type: HoldType; reason: string }>;
  }> {
    const holds = await prisma.hold.findMany({
      where: {
        studentId,
        releasedAt: null,
        blocksTranscript: true,
      },
    });

    return {
      hasHold: holds.length > 0,
      holds: holds.map((h) => ({ type: h.type, reason: h.reason })),
    };
  }
}

export const holdService = new HoldService();
