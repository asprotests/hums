import { prisma, Prisma } from '@hums/database';
import type { WaiverType, FeeWaiverStatus } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

interface CreateFeeWaiverInput {
  studentId: string;
  type: WaiverType;
  amount: number;
  amountType: 'FIXED' | 'PERCENTAGE';
  reason: string;
  supportingDocs?: string[];
  validFrom: Date;
  validTo: Date;
}

interface FeeWaiverQueryInput {
  studentId?: string;
  type?: WaiverType;
  status?: FeeWaiverStatus;
  page?: number;
  limit?: number;
}

export class FeeWaiverService {
  /**
   * Request a fee waiver
   */
  async requestWaiver(data: CreateFeeWaiverInput, requestedById?: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Validate dates
    if (new Date(data.validFrom) >= new Date(data.validTo)) {
      throw AppError.badRequest('Valid from date must be before valid to date');
    }

    const waiver = await prisma.feeWaiver.create({
      data: {
        studentId: data.studentId,
        type: data.type,
        amount: data.amount,
        amountType: data.amountType,
        reason: data.reason,
        supportingDocs: data.supportingDocs as Prisma.InputJsonValue,
        validFrom: data.validFrom,
        validTo: data.validTo,
        status: 'PENDING',
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (requestedById) {
      await auditService.log({
        userId: requestedById,
        action: 'CREATE',
        resource: 'FeeWaiver',
        resourceId: waiver.id,
        newValues: data,
      });
    }

    return waiver;
  }

  /**
   * Get fee waivers with filtering and pagination
   */
  async getWaivers(query: FeeWaiverQueryInput = {}) {
    const { studentId, type, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FeeWaiverWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [waivers, total] = await Promise.all([
      prisma.feeWaiver.findMany({
        where,
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, middleName: true, lastName: true, email: true },
              },
              program: { select: { id: true, code: true, name: true } },
            },
          },
          approvedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feeWaiver.count({ where }),
    ]);

    return {
      data: waivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get waiver by ID
   */
  async getWaiverById(id: string) {
    const waiver = await prisma.feeWaiver.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
            program: { select: { id: true, code: true, name: true } },
          },
        },
        approvedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!waiver) {
      throw AppError.notFound('Fee waiver not found');
    }

    return waiver;
  }

  /**
   * Get pending waivers
   */
  async getPendingWaivers() {
    return prisma.feeWaiver.findMany({
      where: { status: 'PENDING' },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
            program: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get student's waivers
   */
  async getStudentWaivers(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return prisma.feeWaiver.findMany({
      where: { studentId },
      include: {
        approvedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve fee waiver
   */
  async approveWaiver(id: string, approvedById: string) {
    const waiver = await prisma.feeWaiver.findUnique({
      where: { id },
    });

    if (!waiver) {
      throw AppError.notFound('Fee waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw AppError.badRequest('Waiver is not pending');
    }

    const updated = await prisma.feeWaiver.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: approvedById,
      action: 'UPDATE',
      resource: 'FeeWaiver',
      resourceId: id,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED' },
    });

    return updated;
  }

  /**
   * Reject fee waiver
   */
  async rejectWaiver(id: string, reason: string, rejectedById: string) {
    const waiver = await prisma.feeWaiver.findUnique({
      where: { id },
    });

    if (!waiver) {
      throw AppError.notFound('Fee waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw AppError.badRequest('Waiver is not pending');
    }

    const updated = await prisma.feeWaiver.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedById: rejectedById, // Track who reviewed it
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: rejectedById,
      action: 'UPDATE',
      resource: 'FeeWaiver',
      resourceId: id,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'REJECTED', rejectionReason: reason },
    });

    return updated;
  }

  /**
   * Apply waiver to invoice
   */
  async applyToInvoice(id: string, invoiceId: string, userId: string) {
    const waiver = await prisma.feeWaiver.findUnique({
      where: { id },
    });

    if (!waiver) {
      throw AppError.notFound('Fee waiver not found');
    }

    if (waiver.status !== 'APPROVED') {
      throw AppError.badRequest('Waiver must be approved before applying');
    }

    if (waiver.appliedToInvoice) {
      throw AppError.badRequest('Waiver already applied to an invoice');
    }

    // Check validity period
    const now = new Date();
    if (now < waiver.validFrom || now > waiver.validTo) {
      throw AppError.badRequest('Waiver is not within validity period');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    if (invoice.studentId !== waiver.studentId) {
      throw AppError.badRequest('Invoice does not belong to this student');
    }

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot apply to paid or cancelled invoice');
    }

    // Calculate waiver amount
    let waiverAmount = Number(waiver.amount);
    if (waiver.amountType === 'PERCENTAGE') {
      waiverAmount = (Number(invoice.amount) * waiverAmount) / 100;
    }

    // Update waiver status
    const updated = await prisma.feeWaiver.update({
      where: { id },
      data: {
        status: 'APPLIED',
        appliedToInvoice: invoiceId,
      },
    });

    // Update invoice amount
    const newAmount = Number(invoice.amount) - waiverAmount;
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount > 0 ? newAmount : 0,
        status: newAmount <= 0 ? 'PAID' : invoice.status,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'FeeWaiver',
      resourceId: id,
      oldValues: { status: 'APPROVED', appliedToInvoice: null },
      newValues: { status: 'APPLIED', appliedToInvoice: invoiceId },
    });

    return updated;
  }

  /**
   * Delete fee waiver (only if pending)
   */
  async deleteWaiver(id: string, userId: string) {
    const waiver = await prisma.feeWaiver.findUnique({
      where: { id },
    });

    if (!waiver) {
      throw AppError.notFound('Fee waiver not found');
    }

    if (waiver.status !== 'PENDING') {
      throw AppError.badRequest('Can only delete pending waivers');
    }

    await prisma.feeWaiver.delete({ where: { id } });

    await auditService.log({
      userId,
      action: 'DELETE',
      resource: 'FeeWaiver',
      resourceId: id,
      oldValues: waiver,
    });

    return { success: true };
  }
}

export const feeWaiverService = new FeeWaiverService();
