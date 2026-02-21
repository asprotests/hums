import { prisma, Prisma } from '@hums/database';
import type { RefundReason, RefundStatus } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

interface CreateRefundInput {
  studentId: string;
  paymentId: string;
  amount: number;
  reason: RefundReason;
  description?: string;
}

interface RefundQueryInput {
  studentId?: string;
  status?: RefundStatus;
  reason?: RefundReason;
  page?: number;
  limit?: number;
}

export class RefundService {
  /**
   * Request a refund
   */
  async requestRefund(data: CreateRefundInput, requestedById?: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Verify payment exists and belongs to student
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    if (payment.studentId !== data.studentId) {
      throw AppError.badRequest('Payment does not belong to this student');
    }

    // Check if refund amount is valid
    if (data.amount <= 0) {
      throw AppError.badRequest('Refund amount must be positive');
    }

    if (data.amount > Number(payment.amount)) {
      throw AppError.badRequest('Refund amount cannot exceed payment amount');
    }

    // Check for existing pending/processing refunds on this payment
    const existingRefund = await prisma.refundRequest.findFirst({
      where: {
        paymentId: data.paymentId,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
    });

    if (existingRefund) {
      throw AppError.badRequest('A refund request for this payment is already pending');
    }

    const refund = await prisma.refundRequest.create({
      data: {
        studentId: data.studentId,
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        description: data.description,
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
        payment: true,
      },
    });

    if (requestedById) {
      await auditService.log({
        userId: requestedById,
        action: 'CREATE',
        resource: 'RefundRequest',
        resourceId: refund.id,
        newValues: data,
      });
    }

    return refund;
  }

  /**
   * Get refund requests with filtering and pagination
   */
  async getRefunds(query: RefundQueryInput = {}) {
    const { studentId, status, reason, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundRequestWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (reason) where.reason = reason;

    const [refunds, total] = await Promise.all([
      prisma.refundRequest.findMany({
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
          payment: true,
          approvedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          processedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.refundRequest.count({ where }),
    ]);

    return {
      data: refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get refund by ID
   */
  async getRefundById(id: string) {
    const refund = await prisma.refundRequest.findUnique({
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
        payment: {
          include: {
            invoice: true,
          },
        },
        approvedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        processedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    return refund;
  }

  /**
   * Get pending refunds
   */
  async getPendingRefunds() {
    return prisma.refundRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get student's refund requests
   */
  async getStudentRefunds(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return prisma.refundRequest.findMany({
      where: { studentId },
      include: {
        payment: true,
        approvedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        processedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve refund
   */
  async approveRefund(id: string, approvedById: string) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    if (refund.status !== 'PENDING') {
      throw AppError.badRequest('Refund is not pending');
    }

    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        payment: true,
      },
    });

    await auditService.log({
      userId: approvedById,
      action: 'UPDATE',
      resource: 'RefundRequest',
      resourceId: id,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED' },
    });

    return updated;
  }

  /**
   * Reject refund
   */
  async rejectRefund(id: string, reason: string, rejectedById: string) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    if (refund.status !== 'PENDING') {
      throw AppError.badRequest('Refund is not pending');
    }

    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedById: rejectedById,
        approvedAt: new Date(),
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
      resource: 'RefundRequest',
      resourceId: id,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'REJECTED', rejectionReason: reason },
    });

    return updated;
  }

  /**
   * Process refund (mark as processing)
   */
  async startProcessing(id: string, processedById: string) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    if (refund.status !== 'APPROVED') {
      throw AppError.badRequest('Refund must be approved before processing');
    }

    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        processedById,
      },
    });

    await auditService.log({
      userId: processedById,
      action: 'UPDATE',
      resource: 'RefundRequest',
      resourceId: id,
      oldValues: { status: 'APPROVED' },
      newValues: { status: 'PROCESSING' },
    });

    return updated;
  }

  /**
   * Complete refund with reference
   */
  async completeRefund(
    id: string,
    refundMethod: string,
    refundReference: string,
    processedById: string
  ) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    if (refund.status !== 'APPROVED' && refund.status !== 'PROCESSING') {
      throw AppError.badRequest('Refund must be approved or processing');
    }

    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        refundMethod,
        refundReference,
        processedById,
        processedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        payment: true,
      },
    });

    await auditService.log({
      userId: processedById,
      action: 'UPDATE',
      resource: 'RefundRequest',
      resourceId: id,
      oldValues: { status: refund.status },
      newValues: { status: 'COMPLETED', refundMethod, refundReference },
    });

    return updated;
  }

  /**
   * Delete refund request (only if pending)
   */
  async deleteRefund(id: string, userId: string) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refund) {
      throw AppError.notFound('Refund request not found');
    }

    if (refund.status !== 'PENDING') {
      throw AppError.badRequest('Can only delete pending refund requests');
    }

    await prisma.refundRequest.delete({ where: { id } });

    await auditService.log({
      userId,
      action: 'DELETE',
      resource: 'RefundRequest',
      resourceId: id,
      oldValues: refund,
    });

    return { success: true };
  }
}

export const refundService = new RefundService();
