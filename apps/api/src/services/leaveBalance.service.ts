import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';

export interface LeaveBalanceWithType {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  available: number;
  pending: number;
  leaveType: {
    id: string;
    name: string;
    nameLocal: string | null;
    type: string;
    daysPerYear: number;
    isPaid: boolean;
  };
}

export class LeaveBalanceService {
  /**
   * Get employee's leave balances
   */
  async getEmployeeBalances(employeeId: string, year?: number): Promise<LeaveBalanceWithType[]> {
    const currentYear = year || new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            type: true,
            daysPerYear: true,
            isPaid: true,
          },
        },
      },
      orderBy: { leaveType: { name: 'asc' } },
    });

    // Get pending leave requests count for each type
    const pendingRequests = await prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: {
        employeeId,
        status: 'PENDING',
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
        },
        endDate: {
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      _sum: { totalDays: true },
    });

    const pendingByType = new Map(
      pendingRequests.map((p) => [p.leaveTypeId, p._sum.totalDays || 0])
    );

    return balances.map((b) => ({
      ...b,
      pending: pendingByType.get(b.leaveTypeId) || 0,
      available: b.allocated + b.carriedForward - b.used - (pendingByType.get(b.leaveTypeId) || 0),
    }));
  }

  /**
   * Get a specific leave balance
   */
  async getBalance(employeeId: string, leaveTypeId: string, year: number) {
    return prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year,
        },
      },
      include: {
        leaveType: true,
      },
    });
  }

  /**
   * Allocate leave days to an employee
   */
  async allocateLeave(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    userId: string
  ) {
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    // Verify leave type exists
    const leaveType = await prisma.leaveTypeConfig.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw AppError.notFound('Leave type not found');
    }

    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year,
        },
      },
      update: {
        allocated: days,
      },
      create: {
        employeeId,
        leaveTypeId,
        year,
        allocated: days,
        used: 0,
        carriedForward: 0,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveBalance',
      resourceId: balance.id,
      userId,
      newValues: { allocated: days, year, leaveTypeId },
    });

    return balance;
  }

  /**
   * Deduct leave days from an employee's balance
   */
  async deductLeave(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    userId: string
  ) {
    const balance = await this.getBalance(employeeId, leaveTypeId, year);

    if (!balance) {
      throw AppError.badRequest('No leave balance found for this type and year');
    }

    const available = balance.allocated + balance.carriedForward - balance.used;
    if (days > available) {
      throw AppError.badRequest('Insufficient leave balance');
    }

    const updated = await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        used: balance.used + days,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveBalance',
      resourceId: balance.id,
      userId,
      oldValues: { used: balance.used },
      newValues: { used: updated.used },
    });

    return updated;
  }

  /**
   * Restore leave days (when request is cancelled/rejected)
   */
  async restoreLeave(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    userId: string
  ) {
    const balance = await this.getBalance(employeeId, leaveTypeId, year);

    if (!balance) {
      return; // Nothing to restore
    }

    const newUsed = Math.max(0, balance.used - days);

    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { used: newUsed },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveBalance',
      resourceId: balance.id,
      userId,
      oldValues: { used: balance.used },
      newValues: { used: newUsed, reason: 'Leave restored' },
    });
  }

  /**
   * Carry forward unused leave at year end
   */
  async carryForwardLeaves(fromYear: number, userId: string) {
    const toYear = fromYear + 1;

    // Get all leave types that allow carry forward
    const leaveTypes = await prisma.leaveTypeConfig.findMany({
      where: {
        carryForward: true,
        isActive: true,
      },
    });

    if (leaveTypes.length === 0) {
      return { processed: 0 };
    }

    // Get all balances for the from year
    const balances = await prisma.leaveBalance.findMany({
      where: {
        year: fromYear,
        leaveTypeId: { in: leaveTypes.map((t) => t.id) },
      },
      include: {
        leaveType: true,
      },
    });

    let processed = 0;

    for (const balance of balances) {
      const available = balance.allocated + balance.carriedForward - balance.used;
      if (available <= 0) continue;

      const carryAmount = Math.min(available, balance.leaveType.maxCarryDays);
      if (carryAmount <= 0) continue;

      // Create or update next year's balance with carried forward days
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: toYear,
          },
        },
        update: {
          carriedForward: carryAmount,
        },
        create: {
          employeeId: balance.employeeId,
          leaveTypeId: balance.leaveTypeId,
          year: toYear,
          allocated: balance.leaveType.daysPerYear,
          carriedForward: carryAmount,
          used: 0,
        },
      });

      processed++;
    }

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'LeaveBalance',
      resourceId: 'bulk-carry-forward',
      userId,
      newValues: { fromYear, toYear, processed },
    });

    return { processed };
  }

  /**
   * Initialize annual leave allocations for all employees
   */
  async resetAnnualLeaves(year: number, userId: string) {
    // Get all active leave types
    const leaveTypes = await prisma.leaveTypeConfig.findMany({
      where: { isActive: true },
    });

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    let created = 0;

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        // Check if balance already exists
        const existing = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year,
            },
          },
        });

        if (!existing) {
          await prisma.leaveBalance.create({
            data: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year,
              allocated: leaveType.daysPerYear,
              used: 0,
              carriedForward: 0,
            },
          });
          created++;
        }
      }
    }

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'LeaveBalance',
      resourceId: 'bulk-allocation',
      userId,
      newValues: { year, employeesProcessed: employees.length, balancesCreated: created },
    });

    return { employeesProcessed: employees.length, balancesCreated: created };
  }
}

export const leaveBalanceService = new LeaveBalanceService();
