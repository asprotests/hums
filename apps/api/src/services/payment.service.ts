import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma, PaymentMethod } from '@hums/database';
import type { RecordPaymentInput, PaymentQueryInput } from '../validators/finance.validator.js';
import { invoiceService } from './invoice.service.js';

export class PaymentService {
  /**
   * Generate receipt number
   */
  private async generateReceiptNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;

    // Get the last receipt number for this year
    const lastPayment = await prisma.payment.findFirst({
      where: {
        receiptNo: { startsWith: prefix },
      },
      orderBy: { receiptNo: 'desc' },
    });

    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(lastPayment.receiptNo.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Record a payment
   */
  async recordPayment(data: RecordPaymentInput, receivedById: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
      include: {
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // If invoice ID is provided, verify it exists and belongs to the student
    if (data.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) {
        throw AppError.notFound('Invoice not found');
      }

      if (invoice.studentId !== data.studentId) {
        throw AppError.badRequest('Invoice does not belong to this student');
      }

      if (invoice.status === 'CANCELLED') {
        throw AppError.badRequest('Cannot pay a cancelled invoice');
      }

      if (invoice.status === 'PAID') {
        throw AppError.badRequest('Invoice is already fully paid');
      }
    }

    // Generate receipt number
    const receiptNo = await this.generateReceiptNo();

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        studentId: data.studentId,
        invoiceId: data.invoiceId || null,
        amount: data.amount,
        method: data.method as PaymentMethod,
        reference: data.reference || null,
        receivedById,
        notes: data.notes || null,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
            program: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    // Update invoice status if payment is linked to an invoice
    if (data.invoiceId) {
      await invoiceService.updateInvoiceStatus(data.invoiceId);
    }

    return this.formatPayment(payment);
  }

  /**
   * Get payments with pagination and filters
   */
  async getPayments(filters: PaymentQueryInput) {
    const { studentId, method, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (method) {
      where.method = method as PaymentMethod;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  email: true,
                },
              },
              program: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNo: true,
              amount: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map(this.formatPayment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
            program: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    return this.formatPayment(payment);
  }

  /**
   * Get payment by receipt number
   */
  async getPaymentByReceiptNo(receiptNo: string) {
    const payment = await prisma.payment.findUnique({
      where: { receiptNo },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
            program: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    return this.formatPayment(payment);
  }

  /**
   * Get payments for a student
   */
  async getPaymentsByStudent(studentId: string) {
    const payments = await prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            amount: true,
          },
        },
      },
    });

    return payments.map(this.formatPayment);
  }

  /**
   * Void a payment
   */
  async voidPayment(id: string, reason: string, voidedById: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    if (payment.notes?.includes('VOIDED:')) {
      throw AppError.badRequest('Payment is already voided');
    }

    // Check if payment is older than 7 days (would need admin approval in real system)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (payment.createdAt < sevenDaysAgo) {
      throw AppError.badRequest('Cannot void payment older than 7 days without admin approval');
    }

    // Update payment with void note
    const voidedPayment = await prisma.payment.update({
      where: { id },
      data: {
        amount: 0, // Set amount to 0 to reflect voided status
        notes: `${payment.notes || ''}\n\nVOIDED by ${voidedById}: ${reason}`.trim(),
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
            program: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    // Update invoice status if payment was linked to an invoice
    if (payment.invoiceId) {
      await invoiceService.updateInvoiceStatus(payment.invoiceId);
    }

    return this.formatPayment(voidedPayment);
  }

  /**
   * Get daily collection
   */
  async getDailyCollection(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        notes: { not: { contains: 'VOIDED:' } },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const byMethod = payments.reduce(
      (acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalAmount,
      paymentCount: payments.length,
      byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
      payments: payments.map(this.formatPayment),
    };
  }

  /**
   * Get collection report
   */
  async getCollectionReport(dateFrom: string, dateTo: string) {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo + 'T23:59:59.999Z');

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        notes: { not: { contains: 'VOIDED:' } },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
            program: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const byMethod = payments.reduce(
      (acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    const byProgram = payments.reduce(
      (acc, p) => {
        const programCode = p.student.program?.code || 'Unknown';
        acc[programCode] = (acc[programCode] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    // Daily breakdown
    const byDate = payments.reduce(
      (acc, p) => {
        const date = p.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      dateFrom,
      dateTo,
      totalAmount,
      paymentCount: payments.length,
      byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
      byProgram: Object.entries(byProgram).map(([program, total]) => ({ program, total })),
      byDate: Object.entries(byDate)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Generate receipt data for PDF
   */
  async generateReceipt(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);

    // Calculate outstanding balance for the student
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId: payment.studentId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: { payments: true },
    });

    let outstandingBalance = 0;
    for (const invoice of invoices) {
      const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      outstandingBalance += Number(invoice.amount) - paid;
    }

    return {
      receiptNo: payment.receiptNo,
      date: payment.createdAt,
      student: payment.student,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      invoice: payment.invoice,
      outstandingBalance,
      notes: payment.notes,
    };
  }

  /**
   * Format payment for response
   */
  private formatPayment(payment: any) {
    const isVoided = payment.notes?.includes('VOIDED:') || false;

    return {
      id: payment.id,
      receiptNo: payment.receiptNo,
      studentId: payment.studentId,
      student: payment.student
        ? {
            id: payment.student.id,
            studentId: payment.student.studentId,
            name: `${payment.student.user.firstName} ${payment.student.user.middleName ? payment.student.user.middleName + ' ' : ''}${payment.student.user.lastName}`,
            email: payment.student.user.email,
            program: payment.student.program,
          }
        : undefined,
      invoiceId: payment.invoiceId,
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNo: payment.invoice.invoiceNo,
            amount: Number(payment.invoice.amount),
          }
        : undefined,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      receivedById: payment.receivedById,
      notes: payment.notes,
      isVoided,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

export const paymentService = new PaymentService();
