import { prisma, Prisma } from '@hums/database';
import type { PaymentPlanStatus, InstallmentStatus } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

interface CreatePaymentPlanInput {
  studentId: string;
  invoiceId: string;
  downPayment: number;
  numberOfInstallments: number;
  startDate: Date;
  lateFeePercentage?: number;
}

interface PaymentPlanQueryInput {
  studentId?: string;
  status?: PaymentPlanStatus;
  page?: number;
  limit?: number;
}

const MIN_DOWN_PAYMENT_PERCENTAGE = 20;

export class PaymentPlanService {
  /**
   * Create a payment plan
   */
  async createPaymentPlan(data: CreatePaymentPlanInput, createdById: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Verify invoice exists and belongs to student
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    if (invoice.studentId !== data.studentId) {
      throw AppError.badRequest('Invoice does not belong to this student');
    }

    if (invoice.status === 'PAID') {
      throw AppError.badRequest('Invoice is already paid');
    }

    if (invoice.status === 'CANCELLED') {
      throw AppError.badRequest('Invoice is cancelled');
    }

    // Check if payment plan already exists for this invoice
    const existingPlan = await prisma.paymentPlan.findFirst({
      where: {
        invoiceId: data.invoiceId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (existingPlan) {
      throw AppError.badRequest('Payment plan already exists for this invoice');
    }

    // Validate down payment (minimum 20%)
    const invoiceAmount = Number(invoice.amount);
    const minDownPayment = (invoiceAmount * MIN_DOWN_PAYMENT_PERCENTAGE) / 100;

    if (data.downPayment < minDownPayment) {
      throw AppError.badRequest(
        `Down payment must be at least ${MIN_DOWN_PAYMENT_PERCENTAGE}% ($${minDownPayment.toFixed(2)})`
      );
    }

    // Validate number of installments
    if (data.numberOfInstallments < 2 || data.numberOfInstallments > 12) {
      throw AppError.badRequest('Number of installments must be between 2 and 12');
    }

    // Calculate remaining amount and installment amount
    const remainingAmount = invoiceAmount - data.downPayment;
    const installmentAmount = remainingAmount / data.numberOfInstallments;

    // Create payment plan with installments
    const plan = await prisma.paymentPlan.create({
      data: {
        studentId: data.studentId,
        invoiceId: data.invoiceId,
        totalAmount: invoiceAmount,
        downPayment: data.downPayment,
        numberOfInstallments: data.numberOfInstallments,
        startDate: data.startDate,
        lateFeePercentage: data.lateFeePercentage ?? 2,
        createdById,
        status: 'ACTIVE',
        installments: {
          create: Array.from({ length: data.numberOfInstallments }, (_, i) => {
            const dueDate = new Date(data.startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            return {
              number: i + 1,
              amount: installmentAmount,
              dueDate,
              status: 'PENDING' as InstallmentStatus,
            };
          }),
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
          },
        },
        invoice: true,
        installments: {
          orderBy: { number: 'asc' },
        },
      },
    });

    await auditService.log({
      userId: createdById,
      action: 'CREATE',
      resource: 'PaymentPlan',
      resourceId: plan.id,
      newValues: {
        studentId: data.studentId,
        invoiceId: data.invoiceId,
        totalAmount: invoiceAmount,
        numberOfInstallments: data.numberOfInstallments,
      },
    });

    return plan;
  }

  /**
   * Get payment plans with filtering and pagination
   */
  async getPaymentPlans(query: PaymentPlanQueryInput = {}) {
    const { studentId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentPlanWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const [plans, total] = await Promise.all([
      prisma.paymentPlan.findMany({
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
          invoice: true,
          installments: {
            orderBy: { number: 'asc' },
          },
          createdBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentPlan.count({ where }),
    ]);

    // Calculate progress for each plan
    const plansWithProgress = plans.map(plan => {
      const paidInstallments = plan.installments.filter(i => i.status === 'PAID').length;
      const paidAmount = Number(plan.downPayment) +
        plan.installments.reduce((sum, i) => sum + Number(i.paidAmount), 0);

      return {
        ...plan,
        progress: {
          paidInstallments,
          totalInstallments: plan.numberOfInstallments,
          paidAmount,
          totalAmount: Number(plan.totalAmount),
          percentage: (paidAmount / Number(plan.totalAmount)) * 100,
        },
      };
    });

    return {
      data: plansWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment plan by ID
   */
  async getPlanById(id: string) {
    const plan = await prisma.paymentPlan.findUnique({
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
        invoice: true,
        installments: {
          orderBy: { number: 'asc' },
          include: {
            payment: true,
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!plan) {
      throw AppError.notFound('Payment plan not found');
    }

    // Calculate progress
    const paidInstallments = plan.installments.filter(i => i.status === 'PAID').length;
    const paidAmount = Number(plan.downPayment) +
      plan.installments.reduce((sum, i) => sum + Number(i.paidAmount), 0);

    return {
      ...plan,
      progress: {
        paidInstallments,
        totalInstallments: plan.numberOfInstallments,
        paidAmount,
        totalAmount: Number(plan.totalAmount),
        percentage: (paidAmount / Number(plan.totalAmount)) * 100,
      },
    };
  }

  /**
   * Get student's payment plans
   */
  async getStudentPlans(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return prisma.paymentPlan.findMany({
      where: { studentId },
      include: {
        invoice: true,
        installments: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Record installment payment
   */
  async recordInstallmentPayment(
    installmentId: string,
    amount: number,
    paymentId: string,
    userId: string
  ) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: { plan: true },
    });

    if (!installment) {
      throw AppError.notFound('Installment not found');
    }

    if (installment.plan.status !== 'ACTIVE') {
      throw AppError.badRequest('Payment plan is not active');
    }

    if (installment.status === 'PAID') {
      throw AppError.badRequest('Installment is already paid');
    }

    const totalDue = Number(installment.amount) + Number(installment.lateFee);
    const newPaidAmount = Number(installment.paidAmount) + amount;

    let newStatus: InstallmentStatus = 'PARTIAL';
    if (newPaidAmount >= totalDue) {
      newStatus = 'PAID';
    }

    const updated = await prisma.installment.update({
      where: { id: installmentId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? new Date() : installment.paidAt,
        paymentId,
      },
      include: { plan: true },
    });

    // Check if all installments are paid
    const allInstallments = await prisma.installment.findMany({
      where: { planId: installment.planId },
    });

    const allPaid = allInstallments.every(i => i.status === 'PAID');
    if (allPaid) {
      await prisma.paymentPlan.update({
        where: { id: installment.planId },
        data: { status: 'COMPLETED' },
      });
    }

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'Installment',
      resourceId: installmentId,
      oldValues: { paidAmount: Number(installment.paidAmount), status: installment.status },
      newValues: { paidAmount: newPaidAmount, status: newStatus },
    });

    return updated;
  }

  /**
   * Get overdue installments
   */
  async getOverdueInstallments() {
    const now = new Date();

    return prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
        plan: { status: 'ACTIVE' },
      },
      include: {
        plan: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, middleName: true, lastName: true, email: true, phone: true },
                },
              },
            },
            invoice: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Calculate and apply late fees
   */
  async calculateLateFees() {
    const now = new Date();

    // Get all overdue installments that don't have late fees calculated
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
        plan: { status: 'ACTIVE' },
      },
      include: { plan: true },
    });

    const updates = [];
    for (const installment of overdueInstallments) {
      // Calculate weeks overdue
      const dueDate = new Date(installment.dueDate);
      const weeksOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      if (weeksOverdue > 0) {
        const lateFeeRate = Number(installment.plan.lateFeePercentage) / 100;
        const lateFee = Number(installment.amount) * lateFeeRate * weeksOverdue;

        updates.push(
          prisma.installment.update({
            where: { id: installment.id },
            data: {
              lateFee,
              status: 'OVERDUE',
            },
          })
        );
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return { updated: updates.length };
  }

  /**
   * Mark plan as defaulted
   */
  async markPlanDefaulted(planId: string, userId: string) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw AppError.notFound('Payment plan not found');
    }

    if (plan.status !== 'ACTIVE') {
      throw AppError.badRequest('Can only default active plans');
    }

    const updated = await prisma.paymentPlan.update({
      where: { id: planId },
      data: { status: 'DEFAULTED' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'PaymentPlan',
      resourceId: planId,
      oldValues: { status: 'ACTIVE' },
      newValues: { status: 'DEFAULTED' },
    });

    return updated;
  }

  /**
   * Cancel payment plan
   */
  async cancelPlan(planId: string, userId: string) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: planId },
      include: { installments: true },
    });

    if (!plan) {
      throw AppError.notFound('Payment plan not found');
    }

    if (plan.status !== 'ACTIVE') {
      throw AppError.badRequest('Can only cancel active plans');
    }

    // Check if any payments have been made
    const hasPaidInstallments = plan.installments.some(
      i => Number(i.paidAmount) > 0
    );

    if (hasPaidInstallments) {
      throw AppError.badRequest('Cannot cancel plan with paid installments');
    }

    const updated = await prisma.paymentPlan.update({
      where: { id: planId },
      data: { status: 'CANCELLED' },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'PaymentPlan',
      resourceId: planId,
      oldValues: { status: 'ACTIVE' },
      newValues: { status: 'CANCELLED' },
    });

    return updated;
  }
}

export const paymentPlanService = new PaymentPlanService();
