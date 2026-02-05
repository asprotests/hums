import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { EmployeeAttendanceStatus, Prisma } from '@hums/database';

export interface ManualEntryInput {
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut: Date;
  status?: EmployeeAttendanceStatus;
  remarks?: string;
}

export interface EmployeeAttendanceFilters {
  employeeId?: string;
  departmentId?: string;
  date?: Date;
  month?: number;
  year?: number;
  status?: EmployeeAttendanceStatus;
}

// Work schedule configuration (could be made configurable)
const WORK_START_HOUR = 8; // 08:00
const GRACE_MINUTES = 15;
const HALF_DAY_HOURS = 4;

export class EmployeeAttendanceService {
  /**
   * Employee check-in
   */
  async checkIn(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing?.checkIn) {
      throw AppError.conflict('Already checked in today');
    }

    const now = new Date();

    // Determine status based on check-in time
    let status: EmployeeAttendanceStatus = 'PRESENT';
    const workStart = new Date(today);
    workStart.setHours(WORK_START_HOUR, GRACE_MINUTES, 0, 0);

    if (now > workStart) {
      // Late arrival - could be flagged or handled differently
      // For now, still mark as PRESENT
    }

    const attendance = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status,
      },
      create: {
        employeeId,
        date: today,
        checkIn: now,
        status,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: employee.userId,
      action: AuditAction.CREATE,
      resource: 'EmployeeAttendance',
      resourceId: attendance.id,
      newValues: { checkIn: now },
    });

    return attendance;
  }

  /**
   * Employee check-out
   */
  async checkOut(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (!existing) {
      throw AppError.badRequest('No check-in record found for today');
    }

    if (existing.checkOut) {
      throw AppError.conflict('Already checked out today');
    }

    const now = new Date();

    // Calculate work hours
    let workHours = 0;
    if (existing.checkIn) {
      const diffMs = now.getTime() - existing.checkIn.getTime();
      workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    }

    // Update status based on hours worked
    let status: EmployeeAttendanceStatus = existing.status;
    if (workHours < HALF_DAY_HOURS && status === 'PRESENT') {
      status = 'HALF_DAY';
    }

    const attendance = await prisma.employeeAttendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        workHours,
        status,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: employee.userId,
      action: AuditAction.UPDATE,
      resource: 'EmployeeAttendance',
      resourceId: attendance.id,
      oldValues: { checkOut: null },
      newValues: { checkOut: now, workHours },
    });

    return attendance;
  }

  /**
   * Manual entry of attendance
   */
  async manualEntry(input: ManualEntryInput, createdBy: string) {
    const { employeeId, date, checkIn, checkOut, status, remarks } = input;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw AppError.notFound('Employee not found');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Calculate work hours
    let workHours = 0;
    if (checkIn && checkOut) {
      const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
      workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    // Determine status
    let finalStatus: EmployeeAttendanceStatus = status || 'PRESENT';
    if (!status && workHours < HALF_DAY_HOURS && workHours > 0) {
      finalStatus = 'HALF_DAY';
    }

    const attendance = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
      update: {
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        workHours,
        status: finalStatus,
        remarks,
      },
      create: {
        employeeId,
        date: attendanceDate,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        workHours,
        status: finalStatus,
        remarks,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: 'EmployeeAttendance',
      resourceId: attendance.id,
      newValues: attendance,
    });

    return attendance;
  }

  /**
   * Get employee attendance for a month
   */
  async getEmployeeAttendance(
    employeeId: string,
    month: number,
    year: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return attendanceRecords;
  }

  /**
   * Get daily attendance for all employees
   */
  async getDailyAttendance(date: Date, departmentId?: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const whereEmployee: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE',
    };

    if (departmentId) {
      whereEmployee.departmentId = departmentId;
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Get attendance records for the date
    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        date: attendanceDate,
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.employeeId, r])
    );

    // Combine employees with their attendance
    return employees.map((employee) => {
      const attendance = attendanceMap.get(employee.id);
      return {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: `${employee.user.firstName} ${employee.user.lastName}`,
          email: employee.user.email,
          department: employee.department,
        },
        attendance: attendance || null,
        status: attendance?.status || 'ABSENT',
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        workHours: attendance?.workHours || null,
      };
    });
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(departmentId?: string) {
    const today = new Date();
    return this.getDailyAttendance(today, departmentId);
  }

  /**
   * Get attendance summary for an employee
   */
  async getAttendanceSummary(employeeId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await prisma.employeeAttendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      totalWorkHours: 0,
      averageWorkHours: 0,
      lateArrivals: 0,
    };

    const workStart = new Date();
    workStart.setHours(WORK_START_HOUR, GRACE_MINUTES, 0, 0);

    for (const record of records) {
      switch (record.status) {
        case 'PRESENT':
          summary.present++;
          break;
        case 'ABSENT':
          summary.absent++;
          break;
        case 'HALF_DAY':
          summary.halfDay++;
          break;
        case 'ON_LEAVE':
          summary.onLeave++;
          break;
        case 'HOLIDAY':
          summary.holiday++;
          break;
      }

      if (record.workHours) {
        summary.totalWorkHours += Number(record.workHours);
      }

      // Check for late arrivals
      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const expectedStart = new Date(record.date);
        expectedStart.setHours(WORK_START_HOUR, GRACE_MINUTES, 0, 0);
        if (checkInTime > expectedStart) {
          summary.lateArrivals++;
        }
      }
    }

    const workingDays = summary.present + summary.halfDay;
    summary.averageWorkHours =
      workingDays > 0
        ? Math.round((summary.totalWorkHours / workingDays) * 100) / 100
        : 0;

    // Calculate total working days in the month (excluding weekends)
    let totalWorkingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday or Saturday
        totalWorkingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      employeeId,
      month,
      year,
      totalWorkingDays,
      ...summary,
      attendancePercentage:
        totalWorkingDays > 0
          ? Math.round(((summary.present + summary.halfDay) / totalWorkingDays) * 100)
          : 0,
    };
  }

  /**
   * Generate monthly report for a department
   */
  async generateMonthlyReport(
    departmentId: string | undefined,
    month: number,
    year: number
  ) {
    const whereEmployee: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE',
    };

    if (departmentId) {
      whereEmployee.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        user: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
    });

    const reports = await Promise.all(
      employees.map(async (employee) => {
        const summary = await this.getAttendanceSummary(employee.id, month, year);
        return {
          employee: {
            id: employee.id,
            employeeId: employee.employeeId,
            name: `${employee.user.firstName} ${employee.user.lastName}`,
            department: employee.department?.name,
          },
          ...summary,
        };
      })
    );

    // Calculate department-wide statistics
    const totalPresent = reports.reduce((sum, r) => sum + r.present, 0);
    const totalAbsent = reports.reduce((sum, r) => sum + r.absent, 0);
    const totalLateArrivals = reports.reduce((sum, r) => sum + r.lateArrivals, 0);
    const avgAttendance =
      reports.length > 0
        ? Math.round(
            reports.reduce((sum, r) => sum + r.attendancePercentage, 0) /
              reports.length
          )
        : 0;

    return {
      month,
      year,
      departmentId,
      totalEmployees: employees.length,
      overallStatistics: {
        totalPresent,
        totalAbsent,
        totalLateArrivals,
        averageAttendancePercentage: avgAttendance,
      },
      employees: reports,
    };
  }

  /**
   * Get late arrivals for a date
   */
  async getLateArrivals(date: Date, graceMinutes: number = GRACE_MINUTES) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const lateThreshold = new Date(attendanceDate);
    lateThreshold.setHours(WORK_START_HOUR, graceMinutes, 0, 0);

    const lateRecords = await prisma.employeeAttendance.findMany({
      where: {
        date: attendanceDate,
        checkIn: { gt: lateThreshold },
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: { select: { name: true } },
          },
        },
      },
    });

    return lateRecords.map((record) => ({
      employee: {
        id: record.employee.id,
        employeeId: record.employee.employeeId,
        name: `${record.employee.user.firstName} ${record.employee.user.lastName}`,
        email: record.employee.user.email,
        department: record.employee.department?.name,
      },
      checkIn: record.checkIn,
      lateBy: record.checkIn
        ? Math.round(
            (record.checkIn.getTime() - lateThreshold.getTime()) / (1000 * 60)
          )
        : 0,
    }));
  }

  /**
   * Get absentees for a date
   */
  async getAbsentees(date: Date, departmentId?: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const whereEmployee: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE',
    };

    if (departmentId) {
      whereEmployee.departmentId = departmentId;
    }

    // Get all active employees
    const allEmployees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { name: true } },
      },
    });

    // Get employees who checked in
    const presentEmployeeIds = (
      await prisma.employeeAttendance.findMany({
        where: {
          date: attendanceDate,
          status: { in: ['PRESENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY'] },
        },
        select: { employeeId: true },
      })
    ).map((r) => r.employeeId);

    // Filter out present employees
    const absentees = allEmployees.filter(
      (emp) => !presentEmployeeIds.includes(emp.id)
    );

    return absentees.map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      name: `${employee.user.firstName} ${employee.user.lastName}`,
      email: employee.user.email,
      department: employee.department?.name,
    }));
  }

  /**
   * Mark employee as on leave
   */
  async markOnLeave(employeeId: string, date: Date, remarks?: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    return prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
      update: {
        status: 'ON_LEAVE',
        remarks,
      },
      create: {
        employeeId,
        date: attendanceDate,
        status: 'ON_LEAVE',
        remarks,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Mark a date as holiday
   */
  async markHoliday(date: Date, departmentId?: string, remarks?: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const whereEmployee: Prisma.EmployeeWhereInput = {
      status: 'ACTIVE',
    };

    if (departmentId) {
      whereEmployee.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      select: { id: true },
    });

    const records = await Promise.all(
      employees.map((emp) =>
        prisma.employeeAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: attendanceDate,
            },
          },
          update: {
            status: 'HOLIDAY',
            remarks,
          },
          create: {
            employeeId: emp.id,
            date: attendanceDate,
            status: 'HOLIDAY',
            remarks,
          },
        })
      )
    );

    return {
      date: attendanceDate,
      employeesMarked: records.length,
      status: 'HOLIDAY',
    };
  }
}

export const employeeAttendanceService = new EmployeeAttendanceService();
