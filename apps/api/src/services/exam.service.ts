import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { ExamType, ExamStatus, Prisma } from '@hums/database';

export interface CreateExamInput {
  classId: string;
  type: ExamType;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  roomId: string;
  maxScore: number;
  instructions?: string;
}

export interface UpdateExamInput {
  type?: ExamType;
  title?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  duration?: number;
  roomId?: string;
  maxScore?: number;
  instructions?: string;
  status?: ExamStatus;
}

export interface ExamFilters {
  classId?: string;
  semesterId?: string;
  type?: ExamType;
  status?: ExamStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface ConflictResult {
  type: 'student' | 'room';
  description: string;
  examId?: string;
  examTitle?: string;
}

export class ExamService {
  /**
   * Schedule a new exam
   */
  async scheduleExam(input: CreateExamInput, userId?: string) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: input.classId },
      include: { course: true, semester: true },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw AppError.notFound('Room not found');
    }

    // Check for room availability
    const isRoomAvailable = await this.checkRoomAvailability(
      input.roomId,
      input.date,
      input.startTime,
      input.endTime
    );

    if (!isRoomAvailable) {
      throw AppError.badRequest('Room is not available at the specified time');
    }

    // Check for student conflicts
    const conflicts = await this.checkConflicts(
      input.classId,
      input.date,
      input.startTime,
      input.endTime
    );

    if (conflicts.length > 0) {
      // Just warn, don't block
      console.warn('Exam scheduling conflicts detected:', conflicts);
    }

    // Normalize date for DATE type (strips time component)
    const normalizedDate = new Date(input.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const exam = await prisma.exam.create({
      data: {
        classId: input.classId,
        type: input.type,
        title: input.title,
        date: normalizedDate,
        startTime: input.startTime,
        endTime: input.endTime,
        duration: input.duration,
        roomId: input.roomId,
        maxScore: input.maxScore,
        instructions: input.instructions,
      },
      include: {
        class: {
          include: { course: true, semester: true },
        },
        room: true,
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.CREATE,
        resource: 'Exam',
        resourceId: exam.id,
        userId,
        newValues: input,
      });
    }

    return { exam, conflicts };
  }

  /**
   * Update an exam
   */
  async updateExam(id: string, input: UpdateExamInput, userId?: string) {
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Exam not found');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot update completed or cancelled exam');
    }

    // If changing room or time, check availability
    if (input.roomId || input.date || input.startTime || input.endTime) {
      const roomId = input.roomId || existing.roomId;
      const date = input.date || existing.date;
      const startTime = input.startTime || existing.startTime;
      const endTime = input.endTime || existing.endTime;

      const isAvailable = await this.checkRoomAvailability(
        roomId,
        date,
        startTime,
        endTime,
        id
      );

      if (!isAvailable) {
        throw AppError.badRequest('Room is not available at the specified time');
      }
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        type: input.type,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        duration: input.duration,
        roomId: input.roomId,
        maxScore: input.maxScore,
        instructions: input.instructions,
        status: input.status,
      },
      include: {
        class: {
          include: { course: true, semester: true },
        },
        room: true,
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'Exam',
        resourceId: id,
        userId,
        oldValues: {
          title: existing.title,
          date: existing.date,
          startTime: existing.startTime,
        },
        newValues: input,
      });
    }

    return exam;
  }

  /**
   * Cancel an exam
   */
  async cancelExam(id: string, reason: string, userId?: string) {
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Exam not found');
    }

    if (existing.status === 'COMPLETED') {
      throw AppError.badRequest('Cannot cancel completed exam');
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'Exam',
        resourceId: id,
        userId,
        newValues: { status: 'CANCELLED', reason },
      });
    }

    return exam;
  }

  /**
   * Get an exam by ID
   */
  async getExam(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            semester: true,
            lecturer: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
            enrollments: {
              where: { status: 'REGISTERED' },
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    if (!exam) {
      throw AppError.notFound('Exam not found');
    }

    return exam;
  }

  /**
   * Get exams with filters
   */
  async getExams(filters: ExamFilters) {
    const where: Prisma.ExamWhereInput = {};

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.semesterId) {
      where.class = { semesterId: filters.semesterId };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return prisma.exam.findMany({
      where,
      include: {
        class: {
          include: {
            course: true,
            semester: true,
          },
        },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Get exams for a class
   */
  async getClassExams(classId: string) {
    return prisma.exam.findMany({
      where: { classId },
      include: { room: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Check room availability
   */
  async checkRoomAvailability(
    roomId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeExamId?: string
  ): Promise<boolean> {
    // Normalize date to start of day for DATE type comparison
    const examDate = new Date(date);
    examDate.setUTCHours(0, 0, 0, 0);

    // Two time intervals [a,b] and [c,d] overlap if and only if: a < d AND b > c
    // Here: existing exam [startTime, endTime] overlaps with new exam if:
    // existingStart < newEnd AND existingEnd > newStart
    const conflictingExams = await prisma.exam.findMany({
      where: {
        roomId,
        date: examDate,
        status: { not: 'CANCELLED' },
        id: excludeExamId ? { not: excludeExamId } : undefined,
        AND: [
          { startTime: { lt: endTime } },   // existing exam starts before new exam ends
          { endTime: { gt: startTime } },   // existing exam ends after new exam starts
        ],
      },
    });

    return conflictingExams.length === 0;
  }

  /**
   * Check for student conflicts (students with exams at same time)
   */
  async checkConflicts(
    classId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<ConflictResult[]> {
    const conflicts: ConflictResult[] = [];

    // Get students enrolled in this class
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'REGISTERED' },
      select: { studentId: true },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    if (studentIds.length === 0) {
      return conflicts;
    }

    // Normalize date for DATE type comparison
    const examDate = new Date(date);
    examDate.setUTCHours(0, 0, 0, 0);

    // Find other exams these students have at the same time
    // Two time intervals overlap if: existingStart < newEnd AND existingEnd > newStart
    const otherExams = await prisma.exam.findMany({
      where: {
        date: examDate,
        status: { not: 'CANCELLED' },
        classId: { not: classId },
        class: {
          enrollments: {
            some: {
              studentId: { in: studentIds },
              status: 'REGISTERED',
            },
          },
        },
        AND: [
          { startTime: { lt: endTime } },   // existing exam starts before new exam ends
          { endTime: { gt: startTime } },   // existing exam ends after new exam starts
        ],
      },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    for (const exam of otherExams) {
      conflicts.push({
        type: 'student',
        description: `Some students have ${exam.class.course.code} exam at ${exam.startTime}`,
        examId: exam.id,
        examTitle: exam.title,
      });
    }

    return conflicts;
  }

  /**
   * Get exam schedule for a semester
   */
  async getExamSchedule(semesterId: string) {
    const exams = await prisma.exam.findMany({
      where: {
        class: { semesterId },
        status: { not: 'CANCELLED' },
      },
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Group by date
    const schedule = new Map<string, typeof exams>();

    for (const exam of exams) {
      const dateKey = exam.date.toISOString().split('T')[0];
      if (!schedule.has(dateKey)) {
        schedule.set(dateKey, []);
      }
      schedule.get(dateKey)!.push(exam);
    }

    return Array.from(schedule.entries()).map(([date, exams]) => ({
      date,
      exams,
    }));
  }

  /**
   * Get upcoming exams for a student
   */
  async getStudentExams(studentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.exam.findMany({
      where: {
        date: { gte: today },
        status: 'SCHEDULED',
        class: {
          enrollments: {
            some: {
              studentId,
              status: 'REGISTERED',
            },
          },
        },
      },
      include: {
        class: {
          include: { course: true },
        },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Delete an exam
   */
  async deleteExam(id: string, userId?: string) {
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Exam not found');
    }

    if (existing.status === 'COMPLETED') {
      throw AppError.badRequest('Cannot delete completed exam');
    }

    await prisma.exam.delete({
      where: { id },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.DELETE,
        resource: 'Exam',
        resourceId: id,
        userId,
        oldValues: { title: existing.title },
      });
    }
  }
}

export const examService = new ExamService();
