import { Router, type Router as RouterType } from 'express';
import { prisma } from '@hums/database';
import { paymentService } from '../services/payment.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { collectionReportSchema, dailySummarySchema } from '../validators/finance.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// Helper to filter out voided payments (notes is null OR doesn't contain 'VOIDED:')
const notVoidedFilter = {
  OR: [
    { notes: null },
    { notes: { not: { contains: 'VOIDED:' } } },
  ],
};

/**
 * @route   GET /api/v1/finance/dashboard
 * @desc    Get finance dashboard data
 * @access  Private (payments:read)
 */
router.get(
  '/dashboard',
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Total collected today
    const todayPayments = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        ...notVoidedFilter,
      },
      _sum: { amount: true },
      _count: true,
    });

    // Total collected this month
    const monthPayments = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...notVoidedFilter,
      },
      _sum: { amount: true },
      _count: true,
    });

    // Total outstanding
    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        payments: {
          where: notVoidedFilter,
        },
      },
    });

    let totalOutstanding = 0;
    let totalOverdue = 0;
    const now = new Date();

    for (const invoice of outstandingInvoices) {
      const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Number(invoice.amount) - paid;
      totalOutstanding += balance;

      if (invoice.dueDate < now) {
        totalOverdue += balance;
      }
    }

    // Recent payments
    const recentPayments = await prisma.payment.findMany({
      where: notVoidedFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
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
    });

    // Collection by method (this month)
    const collectionByMethod = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...notVoidedFilter,
      },
      _sum: { amount: true },
    });

    // Overdue by program
    const overdueByProgram = await prisma.$queryRaw<
      { programId: string; programCode: string; programName: string; count: bigint; amount: number }[]
    >`
      SELECT
        p.id as "programId",
        p.code as "programCode",
        p.name as "programName",
        COUNT(i.id) as count,
        COALESCE(SUM(i.amount), 0)::float as amount
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN programs p ON s.program_id = p.id
      WHERE i.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND i.due_date < NOW()
      GROUP BY p.id, p.code, p.name
      ORDER BY amount DESC
    `;

    return sendSuccess(res, {
      totalCollectedToday: Number(todayPayments._sum.amount || 0),
      paymentsCountToday: todayPayments._count,
      totalCollectedThisMonth: Number(monthPayments._sum.amount || 0),
      paymentsCountThisMonth: monthPayments._count,
      totalOutstanding,
      totalOverdue,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: Number(p.amount),
        method: p.method,
        studentName: `${p.student.user.firstName} ${p.student.user.middleName ? p.student.user.middleName + ' ' : ''}${p.student.user.lastName}`,
        createdAt: p.createdAt,
      })),
      collectionByMethod: collectionByMethod.map((c) => ({
        method: c.method,
        total: Number(c._sum.amount || 0),
      })),
      overdueByProgram: overdueByProgram.map((o) => ({
        programId: o.programId,
        program: `${o.programCode} - ${o.programName}`,
        count: Number(o.count),
        amount: o.amount,
      })),
    });
  })
);

/**
 * @route   GET /api/v1/finance/reports/collection
 * @desc    Get collection report for a date range
 * @access  Private (reports:read)
 */
router.get(
  '/reports/collection',
  authorize('reports:read'),
  validate(collectionReportSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from: string; to: string };
    const report = await paymentService.getCollectionReport(from, to);
    return sendSuccess(res, report);
  })
);

/**
 * @route   GET /api/v1/finance/reports/daily-summary
 * @desc    Get daily collection summary
 * @access  Private (reports:read)
 */
router.get(
  '/reports/daily-summary',
  authorize('reports:read'),
  validate(dailySummarySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date } = req.query as { date?: string };
    const summary = await paymentService.getDailyCollection(date);
    return sendSuccess(res, summary);
  })
);

/**
 * @route   GET /api/v1/finance/reports/outstanding
 * @desc    Get outstanding balance report
 * @access  Private (reports:read)
 */
router.get(
  '/reports/outstanding',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
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
                code: true,
                name: true,
              },
            },
          },
        },
        payments: {
          where: notVoidedFilter,
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const report = invoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Number(invoice.amount) - totalPaid;
      const daysOverdue = invoice.dueDate < new Date()
        ? Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        studentId: invoice.student.id,
        studentIdNo: invoice.student.studentId,
        studentName: `${invoice.student.user.firstName} ${invoice.student.user.middleName ? invoice.student.user.middleName + ' ' : ''}${invoice.student.user.lastName}`,
        email: invoice.student.user.email,
        program: invoice.student.program?.code,
        invoiceAmount: Number(invoice.amount),
        totalPaid,
        balance,
        dueDate: invoice.dueDate,
        daysOverdue,
        status: invoice.status,
      };
    });

    const summary = {
      totalInvoices: report.length,
      totalAmount: report.reduce((sum, r) => sum + r.invoiceAmount, 0),
      totalPaid: report.reduce((sum, r) => sum + r.totalPaid, 0),
      totalBalance: report.reduce((sum, r) => sum + r.balance, 0),
      overdueCount: report.filter((r) => r.daysOverdue > 0).length,
      overdueAmount: report.filter((r) => r.daysOverdue > 0).reduce((sum, r) => sum + r.balance, 0),
    };

    return sendSuccess(res, { summary, invoices: report });
  })
);

export default router;
