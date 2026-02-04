import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma, InvoiceStatus } from '@hums/database';
import type {
  GenerateInvoiceInput,
  GenerateBulkInvoicesInput,
  InvoiceQueryInput,
} from '../validators/finance.validator.js';
import { feeStructureService } from './feeStructure.service.js';

export class InvoiceService {
  /**
   * Generate invoice number
   */
  private async generateInvoiceNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Get the last invoice number for this year
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNo: { startsWith: prefix },
      },
      orderBy: { invoiceNo: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNo.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Generate invoice for a student
   */
  async generateInvoice(data: GenerateInvoiceInput) {
    // Verify student exists and is active
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
      include: {
        program: true,
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot generate invoice for inactive student');
    }

    // Verify semester exists
    const semester = await prisma.semester.findUnique({
      where: { id: data.semesterId },
      include: { academicYear: true },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    // Check if invoice already exists for this student and semester
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        studentId: data.studentId,
        semesterId: data.semesterId,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (existingInvoice) {
      throw AppError.conflict('Invoice already exists for this student and semester');
    }

    // Get fee structure for the student's program
    const feeStructure = await prisma.feeStructure.findUnique({
      where: {
        programId_academicYear: {
          programId: student.programId,
          academicYear: semester.academicYear.name,
        },
      },
    });

    if (!feeStructure) {
      throw AppError.notFound('Fee structure not found for this program and academic year');
    }

    // Calculate total amount
    const amount = await feeStructureService.calculateTotalFee(feeStructure.id);

    // Generate invoice number
    const invoiceNo = await this.generateInvoiceNo();

    // Set due date (default to 30 days from now if not specified)
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        studentId: data.studentId,
        semesterId: data.semesterId,
        amount,
        dueDate,
        description: data.description || `Tuition fees for ${semester.name}`,
        status: 'PENDING',
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
      },
    });

    return this.formatInvoice(invoice);
  }

  /**
   * Generate bulk invoices for all students in a program/semester
   */
  async generateBulkInvoices(data: GenerateBulkInvoicesInput) {
    // Verify semester exists
    const semester = await prisma.semester.findUnique({
      where: { id: data.semesterId },
      include: { academicYear: true },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    // Build student query
    const studentWhere: Prisma.StudentWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (data.programId) {
      studentWhere.programId = data.programId;
    }

    // Get all eligible students
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        program: true,
      },
    });

    if (students.length === 0) {
      throw AppError.notFound('No eligible students found');
    }

    const results = {
      generated: 0,
      skipped: 0,
      errors: [] as { studentId: string; error: string }[],
    };

    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const student of students) {
      try {
        // Check if invoice already exists
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            studentId: student.id,
            semesterId: data.semesterId,
            status: { notIn: ['CANCELLED'] },
          },
        });

        if (existingInvoice) {
          results.skipped++;
          continue;
        }

        // Get fee structure
        const feeStructure = await prisma.feeStructure.findUnique({
          where: {
            programId_academicYear: {
              programId: student.programId,
              academicYear: semester.academicYear.name,
            },
          },
        });

        if (!feeStructure) {
          results.errors.push({
            studentId: student.id,
            error: 'Fee structure not found',
          });
          continue;
        }

        const amount = await feeStructureService.calculateTotalFee(feeStructure.id);
        const invoiceNo = await this.generateInvoiceNo();

        await prisma.invoice.create({
          data: {
            invoiceNo,
            studentId: student.id,
            semesterId: data.semesterId,
            amount,
            dueDate,
            description: `Tuition fees for ${semester.name}`,
            status: 'PENDING',
          },
        });

        results.generated++;
      } catch (error: any) {
        results.errors.push({
          studentId: student.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get invoices with pagination and filters
   */
  async getInvoices(filters: InvoiceQueryInput) {
    const { studentId, status, semesterId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status as InvoiceStatus;
    }

    if (semesterId) {
      where.semesterId = semesterId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
          payments: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map(this.formatInvoice),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
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
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    return this.formatInvoice(invoice);
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNo: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNo },
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
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    return this.formatInvoice(invoice);
  }

  /**
   * Get invoices for a student
   */
  async getInvoicesByStudent(studentId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    return invoices.map(this.formatInvoice);
  }

  /**
   * Void an invoice
   */
  async voidInvoice(id: string, reason: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw AppError.badRequest('Invoice is already voided');
    }

    if (invoice.payments.length > 0) {
      throw AppError.badRequest('Cannot void invoice with payments. Void payments first.');
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        description: `${invoice.description || ''}\n\nVOIDED: ${reason}`,
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
      },
    });

    return this.formatInvoice(updatedInvoice);
  }

  /**
   * Get outstanding invoices
   */
  async getOutstandingInvoices() {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      orderBy: { dueDate: 'asc' },
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
        payments: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    return invoices.map(this.formatInvoice);
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices() {
    const now = new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
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
        payments: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    // Update status to OVERDUE for any that aren't already
    for (const invoice of invoices) {
      if (invoice.status !== 'OVERDUE') {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        invoice.status = 'OVERDUE';
      }
    }

    return invoices.map(this.formatInvoice);
  }

  /**
   * Update invoice status based on payments
   */
  async updateInvoiceStatus(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice || invoice.status === 'CANCELLED') {
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceAmount = Number(invoice.amount);

    let newStatus: InvoiceStatus;
    if (totalPaid >= invoiceAmount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    } else if (new Date() > invoice.dueDate) {
      newStatus = 'OVERDUE';
    } else {
      newStatus = 'PENDING';
    }

    if (invoice.status !== newStatus) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }
  }

  /**
   * Format invoice for response
   */
  private formatInvoice(invoice: any) {
    const totalPaid = invoice.payments
      ? invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      : 0;
    const balance = Number(invoice.amount) - totalPaid;

    return {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      studentId: invoice.studentId,
      student: invoice.student
        ? {
            id: invoice.student.id,
            studentId: invoice.student.studentId,
            name: `${invoice.student.user.firstName} ${invoice.student.user.middleName ? invoice.student.user.middleName + ' ' : ''}${invoice.student.user.lastName}`,
            email: invoice.student.user.email,
            program: invoice.student.program,
          }
        : undefined,
      semesterId: invoice.semesterId,
      amount: Number(invoice.amount),
      totalPaid,
      balance,
      dueDate: invoice.dueDate,
      status: invoice.status,
      description: invoice.description,
      payments: invoice.payments?.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        createdAt: p.createdAt,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}

export const invoiceService = new InvoiceService();
