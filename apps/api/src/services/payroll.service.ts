import { prisma, Prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import { salaryComponentService } from './salaryComponent.service.js';
import type { PayrollStatus } from '@hums/database';

const { Decimal } = Prisma;

export interface PayrollFilters {
  month?: number;
  year?: number;
  status?: PayrollStatus;
  employeeId?: string;
  departmentId?: string;
}

export interface PayrollWithDetails {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: Prisma.Decimal;
  grossSalary: Prisma.Decimal;
  totalAllowances: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netSalary: Prisma.Decimal;
  status: PayrollStatus;
  processedAt: Date | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  employee: {
    id: string;
    employeeId: string;
    position: string;
    user: {
      firstName: string;
      lastName: string;
    };
    department: {
      id: string;
      name: string;
    } | null;
    bankName: string | null;
    bankAccount: string | null;
    mobileWallet: string | null;
  };
  items: {
    id: string;
    name: string;
    type: string;
    calculationType: string;
    value: Prisma.Decimal;
    amount: Prisma.Decimal;
  }[];
  approvedBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

export interface PayrollCalculation {
  baseSalary: number;
  allowances: { name: string; type: string; value: number; amount: number }[];
  deductions: { name: string; type: string; value: number; amount: number }[];
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
}

export class PayrollService {
  /**
   * Calculate payroll for an employee
   */
  async calculatePayroll(
    employeeId: string,
    _month: number,
    _year: number
  ): Promise<PayrollCalculation> {
    // Get employee with salary
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        salary: true,
        status: true,
      },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    if (employee.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot process payroll for inactive employee');
    }

    const baseSalary = Number(employee.salary);

    // Get employee's salary components
    const components = await salaryComponentService.getEmployeeComponents(employeeId);

    const allowances: { name: string; type: string; value: number; amount: number }[] = [];
    const deductions: { name: string; type: string; value: number; amount: number }[] = [];

    let totalAllowances = 0;
    let totalDeductions = 0;

    for (const { component, value } of components) {
      if (!component.isActive) continue;

      const numValue = Number(value);
      let amount: number;

      if (component.calculationType === 'PERCENTAGE') {
        amount = (baseSalary * numValue) / 100;
      } else {
        amount = numValue;
      }

      const item = {
        name: component.name,
        type: component.calculationType,
        value: numValue,
        amount: Math.round(amount * 100) / 100,
      };

      if (component.type === 'ALLOWANCE') {
        allowances.push(item);
        totalAllowances += amount;
      } else {
        deductions.push(item);
        totalDeductions += amount;
      }
    }

    const grossSalary = baseSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    return {
      baseSalary,
      allowances,
      deductions,
      grossSalary: Math.round(grossSalary * 100) / 100,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
    };
  }

  /**
   * Process payroll for a single employee
   */
  async processEmployeePayroll(
    employeeId: string,
    month: number,
    year: number,
    userId: string
  ): Promise<PayrollWithDetails> {
    // Check if payroll already exists
    const existing = await prisma.payroll.findUnique({
      where: {
        employeeId_month_year: { employeeId, month, year },
      },
    });

    if (existing && existing.status !== 'DRAFT') {
      throw AppError.badRequest('Payroll already processed for this period');
    }

    // Calculate payroll
    const calculation = await this.calculatePayroll(employeeId, month, year);

    // Create or update payroll
    const payroll = await prisma.payroll.upsert({
      where: {
        employeeId_month_year: { employeeId, month, year },
      },
      update: {
        baseSalary: new Decimal(calculation.baseSalary),
        grossSalary: new Decimal(calculation.grossSalary),
        totalAllowances: new Decimal(calculation.totalAllowances),
        totalDeductions: new Decimal(calculation.totalDeductions),
        netSalary: new Decimal(calculation.netSalary),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
      create: {
        employeeId,
        month,
        year,
        baseSalary: new Decimal(calculation.baseSalary),
        grossSalary: new Decimal(calculation.grossSalary),
        totalAllowances: new Decimal(calculation.totalAllowances),
        totalDeductions: new Decimal(calculation.totalDeductions),
        netSalary: new Decimal(calculation.netSalary),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Delete existing items and create new ones
    await prisma.payrollItem.deleteMany({
      where: { payrollId: payroll.id },
    });

    // Create allowance items
    for (const allowance of calculation.allowances) {
      await prisma.payrollItem.create({
        data: {
          payrollId: payroll.id,
          name: allowance.name,
          type: 'ALLOWANCE',
          calculationType: allowance.type as 'FIXED' | 'PERCENTAGE',
          value: new Decimal(allowance.value),
          amount: new Decimal(allowance.amount),
        },
      });
    }

    // Create deduction items
    for (const deduction of calculation.deductions) {
      await prisma.payrollItem.create({
        data: {
          payrollId: payroll.id,
          name: deduction.name,
          type: 'DEDUCTION',
          calculationType: deduction.type as 'FIXED' | 'PERCENTAGE',
          value: new Decimal(deduction.value),
          amount: new Decimal(deduction.amount),
        },
      });
    }

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'Payroll',
      resourceId: payroll.id,
      userId,
      newValues: { month, year, netSalary: calculation.netSalary },
    });

    return this.getPayrollById(payroll.id);
  }

  /**
   * Process payroll for multiple employees
   */
  async processPayroll(
    month: number,
    year: number,
    departmentId: string | undefined,
    userId: string
  ) {
    const where: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE',
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where,
      select: { id: true },
    });

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as { employeeId: string; error: string }[],
    };

    for (const employee of employees) {
      try {
        await this.processEmployeePayroll(employee.id, month, year, userId);
        results.processed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          employeeId: employee.id,
          error: error.message,
        });
      }
    }

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'Payroll',
      resourceId: 'bulk-process',
      userId,
      newValues: { month, year, departmentId, ...results },
    });

    return results;
  }

  /**
   * Get payrolls with filters and pagination
   */
  async getPayrolls(filters: PayrollFilters, page: number = 1, limit: number = 20) {
    const where: Prisma.PayrollWhereInput = {};

    if (filters.month) {
      where.month = filters.month;
    }
    if (filters.year) {
      where.year = filters.year;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              position: true,
              user: { select: { firstName: true, lastName: true } },
              department: { select: { id: true, name: true } },
              bankName: true,
              bankAccount: true,
              mobileWallet: true,
            },
          },
          items: true,
          approvedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payroll.count({ where }),
    ]);

    return {
      data: payrolls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(id: string): Promise<PayrollWithDetails> {
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            position: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
            bankName: true,
            bankAccount: true,
            mobileWallet: true,
          },
        },
        items: true,
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!payroll) {
      throw AppError.notFound('Payroll not found');
    }

    return payroll as PayrollWithDetails;
  }

  /**
   * Get employee's payrolls
   */
  async getEmployeePayrolls(employeeId: string, year?: number) {
    const where: Prisma.PayrollWhereInput = { employeeId };

    if (year) {
      where.year = year;
    }

    return prisma.payroll.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /**
   * Approve a payroll
   */
  async approvePayroll(payrollId: string, approvedById: string) {
    const payroll = await this.getPayrollById(payrollId);

    if (payroll.status !== 'PROCESSED') {
      throw AppError.badRequest('Only processed payrolls can be approved');
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'Payroll',
      resourceId: payrollId,
      userId: approvedById,
      oldValues: { status: 'PROCESSED' },
      newValues: { status: 'APPROVED' },
    });

    return updated;
  }

  /**
   * Mark a payroll as paid
   */
  async markAsPaid(payrollId: string, userId: string) {
    const payroll = await this.getPayrollById(payrollId);

    if (payroll.status !== 'APPROVED') {
      throw AppError.badRequest('Only approved payrolls can be marked as paid');
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'Payroll',
      resourceId: payrollId,
      userId,
      oldValues: { status: 'APPROVED' },
      newValues: { status: 'PAID', paidAt: updated.paidAt },
    });

    return updated;
  }

  /**
   * Bulk mark payrolls as paid
   */
  async bulkMarkAsPaid(payrollIds: string[], userId: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { payrollId: string; error: string }[],
    };

    for (const payrollId of payrollIds) {
      try {
        await this.markAsPaid(payrollId, userId);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          payrollId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Generate payroll report for a month
   */
  async generatePayrollReport(month: number, year: number) {
    const payrolls = await prisma.payroll.findMany({
      where: { month, year },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            position: true,
            user: { select: { firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        items: true,
      },
    });

    // Calculate totals
    const totals = {
      totalBaseSalary: 0,
      totalGrossSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      employeeCount: payrolls.length,
    };

    // Group by department
    const byDepartment: Record<string, any> = {};

    for (const payroll of payrolls) {
      totals.totalBaseSalary += Number(payroll.baseSalary);
      totals.totalGrossSalary += Number(payroll.grossSalary);
      totals.totalAllowances += Number(payroll.totalAllowances);
      totals.totalDeductions += Number(payroll.totalDeductions);
      totals.totalNetSalary += Number(payroll.netSalary);

      const deptName = payroll.employee.department?.name || 'No Department';
      if (!byDepartment[deptName]) {
        byDepartment[deptName] = {
          employees: [],
          total: 0,
        };
      }
      byDepartment[deptName].employees.push(payroll);
      byDepartment[deptName].total += Number(payroll.netSalary);
    }

    // Group by status
    const byStatus = {
      draft: payrolls.filter((p) => p.status === 'DRAFT').length,
      processed: payrolls.filter((p) => p.status === 'PROCESSED').length,
      approved: payrolls.filter((p) => p.status === 'APPROVED').length,
      paid: payrolls.filter((p) => p.status === 'PAID').length,
    };

    return {
      month,
      year,
      totals,
      byDepartment,
      byStatus,
      payrolls,
    };
  }

  /**
   * Generate bank file for payroll (CSV format)
   */
  async generateBankFile(month: number, year: number) {
    const payrolls = await prisma.payroll.findMany({
      where: {
        month,
        year,
        status: 'APPROVED',
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
            bankName: true,
            bankAccount: true,
            mobileWallet: true,
          },
        },
      },
    });

    // Generate CSV content
    const headers = [
      'Employee ID',
      'Employee Name',
      'Bank Name',
      'Bank Account',
      'Mobile Wallet',
      'Net Salary',
    ];

    const rows = payrolls.map((p) => [
      p.employee.employeeId,
      `${p.employee.user.firstName} ${p.employee.user.lastName}`,
      p.employee.bankName || '',
      p.employee.bankAccount || '',
      p.employee.mobileWallet || '',
      Number(p.netSalary).toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    return {
      filename: `payroll_${year}_${month.toString().padStart(2, '0')}.csv`,
      content: csv,
      recordCount: payrolls.length,
      totalAmount: payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0),
    };
  }
}

export const payrollService = new PayrollService();
