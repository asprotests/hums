import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { AttendanceStatus, Prisma } from '@hums/database';

export interface AttendanceInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MarkAttendanceInput {
  classId: string;
  date: Date;
  records: AttendanceInput[];
}

export interface AttendanceFilters {
  classId?: string;
  studentId?: string;
  semesterId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
}

export interface ExcuseInput {
  studentId: string;
  classId: string;
  date: Date;
  reason: string;
  documentUrl?: string;
}

export class StudentAttendanceService {
  /**
   * Mark attendance for multiple students in a class
   */
  async markAttendance(input: MarkAttendanceInput, markedById: string) {
    const { classId, date, records } = input;

    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: { enrollments: { where: { status: 'REGISTERED' } } },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Convert date to start of day for consistency
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const createdRecords = [];

    for (const record of records) {
      // Verify student is enrolled in the class
      const isEnrolled = classEntity.enrollments.some(
        (e) => e.studentId === record.studentId
      );

      if (!isEnrolled) {
        continue; // Skip students not enrolled
      }

      const attendance = await prisma.studentAttendance.upsert({
        where: {
          studentId_classId_date: {
            studentId: record.studentId,
            classId,
            date: attendanceDate,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          markedById,
          markedAt: new Date(),
        },
        create: {
          studentId: record.studentId,
          classId,
          date: attendanceDate,
          status: record.status,
          remarks: record.remarks,
          markedById,
        },
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      createdRecords.push(attendance);
    }

    await auditService.log({
      userId: markedById,
      action: AuditAction.CREATE,
      resource: 'StudentAttendance',
      resourceId: classId,
      newValues: { date: attendanceDate, recordCount: createdRecords.length },
    });

    return createdRecords;
  }

  /**
   * Mark attendance for a single student
   */
  async markSingleAttendance(
    classId: string,
    studentId: string,
    date: Date,
    status: AttendanceStatus,
    markedById: string,
    remarks?: string
  ) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Verify student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classId, status: 'REGISTERED' },
    });

    if (!enrollment) {
      throw AppError.badRequest('Student is not enrolled in this class');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.studentAttendance.upsert({
      where: {
        studentId_classId_date: {
          studentId,
          classId,
          date: attendanceDate,
        },
      },
      update: {
        status,
        remarks,
        markedById,
        markedAt: new Date(),
      },
      create: {
        studentId,
        classId,
        date: attendanceDate,
        status,
        remarks,
        markedById,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    return attendance;
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(
    id: string,
    status: AttendanceStatus,
    userId: string,
    remarks?: string
  ) {
    const existing = await prisma.studentAttendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Attendance record not found');
    }

    const updated = await prisma.studentAttendance.update({
      where: { id },
      data: {
        status,
        remarks,
        markedById: userId,
        markedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'StudentAttendance',
      resourceId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Get attendance for a class on a specific date
   */
  async getClassAttendance(classId: string, date: Date) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Get all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'REGISTERED' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Get existing attendance records
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: { classId, date: attendanceDate },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        markedBy: { select: { firstName: true, lastName: true } },
        excuse: true,
      },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.studentId, r])
    );

    // Return combined list with unmarked students
    return enrollments.map((enrollment) => {
      const attendance = attendanceMap.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        student: enrollment.student,
        attendance: attendance || null,
        status: attendance?.status || null,
        remarks: attendance?.remarks || null,
      };
    });
  }

  /**
   * Get attendance for a class in a date range
   */
  async getClassAttendanceByDateRange(
    classId: string,
    startDate: Date,
    endDate: Date
  ) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        classId,
        date: { gte: start, lte: end },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        markedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'asc' }, { student: { user: { firstName: 'asc' } } }],
    });

    return attendanceRecords;
  }

  /**
   * Get attendance for a student
   */
  async getStudentAttendance(filters: AttendanceFilters) {
    const { studentId, classId, semesterId, startDate, endDate, status } = filters;

    const where: Prisma.StudentAttendanceWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (semesterId) {
      where.class = { semesterId };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (status) where.status = status;

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where,
      include: {
        class: {
          include: {
            course: { select: { id: true, name: true, code: true } },
            semester: { select: { id: true, name: true } },
          },
        },
        excuse: true,
      },
      orderBy: { date: 'desc' },
    });

    return attendanceRecords;
  }

  /**
   * Get attendance summary for a student
   */
  async getStudentAttendanceSummary(studentId: string, semesterId?: string) {
    // Get all classes for the student in the semester
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'REGISTERED',
        ...(semesterId && { semesterId }),
      },
      include: {
        class: {
          include: {
            course: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const classSummaries = await Promise.all(
      enrollments.map(async (enrollment) => {
        const stats = await this.calculateAttendanceStats(
          studentId,
          enrollment.classId
        );

        return {
          classId: enrollment.classId,
          className: enrollment.class.name,
          courseName: enrollment.class.course.name,
          courseCode: enrollment.class.course.code,
          ...stats,
        };
      })
    );

    // Calculate overall stats
    const totalClasses = classSummaries.reduce(
      (sum, c) => sum + c.totalClasses,
      0
    );
    const totalPresent = classSummaries.reduce(
      (sum, c) => sum + c.present,
      0
    );
    const totalAbsent = classSummaries.reduce(
      (sum, c) => sum + c.absent,
      0
    );
    const totalLate = classSummaries.reduce((sum, c) => sum + c.late, 0);
    const totalExcused = classSummaries.reduce(
      (sum, c) => sum + c.excused,
      0
    );

    const overallPercentage =
      totalClasses > 0
        ? Math.round(((totalPresent + totalLate) / totalClasses) * 100)
        : 0;

    return {
      studentId,
      semesterId,
      overall: {
        totalClasses,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused,
        percentage: overallPercentage,
      },
      byClass: classSummaries,
    };
  }

  /**
   * Calculate attendance percentage for a student in a class
   */
  async calculateAttendancePercentage(
    studentId: string,
    classId: string
  ): Promise<number> {
    const stats = await this.calculateAttendanceStats(studentId, classId);
    return stats.percentage;
  }

  /**
   * Helper to calculate attendance stats
   */
  private async calculateAttendanceStats(studentId: string, classId: string) {
    const records = await prisma.studentAttendance.groupBy({
      by: ['status'],
      where: { studentId, classId },
      _count: { status: true },
    });

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      totalClasses: 0,
      percentage: 0,
    };

    for (const record of records) {
      const count = record._count.status;
      stats.totalClasses += count;

      switch (record.status) {
        case 'PRESENT':
          stats.present = count;
          break;
        case 'ABSENT':
          stats.absent = count;
          break;
        case 'LATE':
          stats.late = count;
          break;
        case 'EXCUSED':
          stats.excused = count;
          break;
      }
    }

    // Present and Late count as attended for percentage calculation
    stats.percentage =
      stats.totalClasses > 0
        ? Math.round(((stats.present + stats.late) / stats.totalClasses) * 100)
        : 0;

    return stats;
  }

  /**
   * Get students below attendance threshold
   */
  async getStudentsBelowThreshold(classId: string, threshold: number = 75) {
    // Get all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'REGISTERED' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    const studentsWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        const stats = await this.calculateAttendanceStats(
          enrollment.studentId,
          classId
        );
        return {
          student: enrollment.student,
          ...stats,
        };
      })
    );

    return studentsWithStats.filter((s) => s.percentage < threshold);
  }

  /**
   * Get class attendance report
   */
  async getClassAttendanceReport(classId: string) {
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        semester: true,
        lecturer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'REGISTERED' },
    });

    const totalStudents = enrollments.length;

    // Get all attendance dates
    const attendanceDates = await prisma.studentAttendance.findMany({
      where: { classId },
      distinct: ['date'],
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    const totalSessions = attendanceDates.length;

    // Get overall stats
    const overallStats = await prisma.studentAttendance.groupBy({
      by: ['status'],
      where: { classId },
      _count: { status: true },
    });

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    for (const record of overallStats) {
      switch (record.status) {
        case 'PRESENT':
          stats.present = record._count.status;
          break;
        case 'ABSENT':
          stats.absent = record._count.status;
          break;
        case 'LATE':
          stats.late = record._count.status;
          break;
        case 'EXCUSED':
          stats.excused = record._count.status;
          break;
      }
    }

    const totalRecords = stats.present + stats.absent + stats.late + stats.excused;
    const averageAttendance =
      totalRecords > 0
        ? Math.round(((stats.present + stats.late) / totalRecords) * 100)
        : 0;

    // Get students below 75% threshold
    const belowThreshold = await this.getStudentsBelowThreshold(classId, 75);

    return {
      class: {
        id: classEntity.id,
        name: classEntity.name,
        course: classEntity.course,
        semester: classEntity.semester,
        lecturer: classEntity.lecturer,
      },
      statistics: {
        totalStudents,
        totalSessions,
        ...stats,
        averageAttendance,
        studentsAtRisk: belowThreshold.length,
      },
      studentsAtRisk: belowThreshold,
      sessions: attendanceDates.map((d) => d.date),
    };
  }

  // ==========================================
  // EXCUSE MANAGEMENT
  // ==========================================

  /**
   * Submit an attendance excuse
   */
  async submitExcuse(input: ExcuseInput, userId?: string) {
    const { studentId, classId, date, reason, documentUrl } = input;

    // Verify student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Verify class
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    const excuseDate = new Date(date);
    excuseDate.setHours(0, 0, 0, 0);

    // Check if excuse already exists
    const existing = await prisma.attendanceExcuse.findUnique({
      where: {
        studentId_classId_date: {
          studentId,
          classId,
          date: excuseDate,
        },
      },
    });

    if (existing) {
      throw AppError.conflict('An excuse for this date already exists');
    }

    const excuse = await prisma.attendanceExcuse.create({
      data: {
        studentId,
        classId,
        date: excuseDate,
        reason,
        documentUrl,
        status: 'PENDING',
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: {
          include: {
            course: { select: { name: true, code: true } },
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'AttendanceExcuse',
      resourceId: excuse.id,
      newValues: excuse,
    });

    return excuse;
  }

  /**
   * Approve an excuse
   */
  async approveExcuse(excuseId: string, reviewedById: string, remarks?: string) {
    const excuse = await prisma.attendanceExcuse.findUnique({
      where: { id: excuseId },
    });

    if (!excuse) {
      throw AppError.notFound('Excuse not found');
    }

    if (excuse.status !== 'PENDING') {
      throw AppError.badRequest('Excuse has already been reviewed');
    }

    const updated = await prisma.attendanceExcuse.update({
      where: { id: excuseId },
      data: {
        status: 'APPROVED',
        reviewedById,
        reviewedAt: new Date(),
        reviewRemarks: remarks,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Update the attendance record to EXCUSED if it exists
    await prisma.studentAttendance.updateMany({
      where: {
        studentId: excuse.studentId,
        classId: excuse.classId,
        date: excuse.date,
      },
      data: {
        status: 'EXCUSED',
        excuseId: excuse.id,
      },
    });

    await auditService.log({
      userId: reviewedById,
      action: AuditAction.UPDATE,
      resource: 'AttendanceExcuse',
      resourceId: excuseId,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED' },
    });

    return updated;
  }

  /**
   * Reject an excuse
   */
  async rejectExcuse(excuseId: string, reviewedById: string, remarks: string) {
    const excuse = await prisma.attendanceExcuse.findUnique({
      where: { id: excuseId },
    });

    if (!excuse) {
      throw AppError.notFound('Excuse not found');
    }

    if (excuse.status !== 'PENDING') {
      throw AppError.badRequest('Excuse has already been reviewed');
    }

    const updated = await prisma.attendanceExcuse.update({
      where: { id: excuseId },
      data: {
        status: 'REJECTED',
        reviewedById,
        reviewedAt: new Date(),
        reviewRemarks: remarks,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await auditService.log({
      userId: reviewedById,
      action: AuditAction.UPDATE,
      resource: 'AttendanceExcuse',
      resourceId: excuseId,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'REJECTED', reviewRemarks: remarks },
    });

    return updated;
  }

  /**
   * Get pending excuses for a class
   */
  async getPendingExcuses(classId?: string) {
    const where: Prisma.AttendanceExcuseWhereInput = {
      status: 'PENDING',
    };

    if (classId) {
      where.classId = classId;
    }

    return prisma.attendanceExcuse.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: {
          include: {
            course: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get excuses for a student
   */
  async getStudentExcuses(studentId: string) {
    return prisma.attendanceExcuse.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            course: { select: { name: true, code: true } },
          },
        },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const studentAttendanceService = new StudentAttendanceService();
