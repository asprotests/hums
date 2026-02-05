import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import { roomService } from './room.service.js';
import type { Prisma, ScheduleType } from '@hums/database';

export interface CreateScheduleInput {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType?: ScheduleType;
}

export interface UpdateScheduleInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string | null;
  scheduleType?: ScheduleType;
}

export interface ScheduleFilters {
  classId?: string;
  roomId?: string;
  dayOfWeek?: number;
  semesterId?: string;
  lecturerId?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class ScheduleService {
  /**
   * Validate time format and range
   */
  private validateTimeRange(startTime: string, endTime: string) {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start >= end) {
      throw AppError.badRequest('End time must be after start time');
    }

    // Minimum 30 minutes duration
    if (end - start < 30) {
      throw AppError.badRequest('Schedule must be at least 30 minutes long');
    }

    // Maximum 4 hours duration
    if (end - start > 240) {
      throw AppError.badRequest('Schedule cannot exceed 4 hours');
    }
  }

  /**
   * Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check for lecturer conflicts
   */
  private async checkLecturerConflict(
    lecturerId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    semesterId: string,
    excludeScheduleId?: string
  ) {
    const conflicts = await prisma.schedule.findMany({
      where: {
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        dayOfWeek,
        class: {
          lecturerId,
          semesterId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
        },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    return conflicts;
  }

  /**
   * Create a new schedule
   */
  async createSchedule(data: CreateScheduleInput, userId?: string) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: data.classId },
      include: {
        course: true,
        semester: true,
      },
    });

    if (!classEntity || classEntity.deletedAt) {
      throw AppError.notFound('Class not found');
    }

    if (classEntity.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot add schedule to a cancelled class');
    }

    // Validate time range
    this.validateTimeRange(data.startTime, data.endTime);

    // Check for lecturer conflicts
    const lecturerConflicts = await this.checkLecturerConflict(
      classEntity.lecturerId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      classEntity.semesterId
    );

    if (lecturerConflicts.length > 0) {
      const conflict = lecturerConflicts[0];
      throw AppError.conflict(
        `Lecturer has a conflicting schedule: ${conflict.class.course.code} on ${DAYS_OF_WEEK[data.dayOfWeek]} ${conflict.startTime}-${conflict.endTime}`
      );
    }

    // Check room availability if room is provided
    if (data.roomId) {
      const roomAvailability = await roomService.checkRoomAvailability(
        data.roomId,
        data.dayOfWeek,
        data.startTime,
        data.endTime
      );

      if (!roomAvailability.available) {
        throw AppError.conflict(roomAvailability.reason || 'Room is not available');
      }
    }

    const schedule = await prisma.schedule.create({
      data: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        roomId: data.roomId,
        scheduleType: data.scheduleType || 'LECTURE',
      },
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'Schedule',
      resourceId: schedule.id,
      newValues: schedule,
    });

    return {
      ...schedule,
      dayName: DAYS_OF_WEEK[schedule.dayOfWeek],
    };
  }

  /**
   * Get schedules with filters
   */
  async getSchedules(filters: ScheduleFilters = {}) {
    const { classId, roomId, dayOfWeek, semesterId, lecturerId } = filters;

    const where: Prisma.ScheduleWhereInput = {};

    if (classId) {
      where.classId = classId;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    if (typeof dayOfWeek === 'number') {
      where.dayOfWeek = dayOfWeek;
    }

    if (semesterId || lecturerId) {
      where.class = {
        deletedAt: null,
        ...(semesterId && { semesterId }),
        ...(lecturerId && { lecturerId }),
      };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return schedules.map((s) => ({
      ...s,
      dayName: DAYS_OF_WEEK[s.dayOfWeek],
    }));
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string) {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            semester: true,
            lecturer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    if (!schedule) {
      throw AppError.notFound('Schedule not found');
    }

    return {
      ...schedule,
      dayName: DAYS_OF_WEEK[schedule.dayOfWeek],
    };
  }

  /**
   * Update schedule
   */
  async updateSchedule(id: string, data: UpdateScheduleInput, userId?: string) {
    const schedule = await this.getScheduleById(id);

    const dayOfWeek = data.dayOfWeek ?? schedule.dayOfWeek;
    const startTime = data.startTime ?? schedule.startTime;
    const endTime = data.endTime ?? schedule.endTime;
    const roomId = data.roomId !== undefined ? data.roomId : schedule.roomId;

    // Validate time range if times are changing
    if (data.startTime || data.endTime) {
      this.validateTimeRange(startTime, endTime);
    }

    // Check for lecturer conflicts if day or time is changing
    if (data.dayOfWeek !== undefined || data.startTime || data.endTime) {
      const lecturerConflicts = await this.checkLecturerConflict(
        schedule.class.lecturerId,
        dayOfWeek,
        startTime,
        endTime,
        schedule.class.semesterId,
        id
      );

      if (lecturerConflicts.length > 0) {
        const conflict = lecturerConflicts[0];
        throw AppError.conflict(
          `Lecturer has a conflicting schedule: ${conflict.class.course.code} on ${DAYS_OF_WEEK[dayOfWeek]} ${conflict.startTime}-${conflict.endTime}`
        );
      }
    }

    // Check room availability if room is changing
    if (roomId && (data.roomId !== undefined || data.dayOfWeek !== undefined || data.startTime || data.endTime)) {
      const roomAvailability = await roomService.checkRoomAvailability(
        roomId,
        dayOfWeek,
        startTime,
        endTime,
        id
      );

      if (!roomAvailability.available) {
        throw AppError.conflict(roomAvailability.reason || 'Room is not available');
      }
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        roomId: data.roomId,
        scheduleType: data.scheduleType,
      },
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Schedule',
      resourceId: id,
      oldValues: schedule,
      newValues: updated,
    });

    return {
      ...updated,
      dayName: DAYS_OF_WEEK[updated.dayOfWeek],
    };
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string, userId?: string) {
    const schedule = await this.getScheduleById(id);

    await prisma.schedule.delete({
      where: { id },
    });

    await auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'Schedule',
      resourceId: id,
      oldValues: schedule,
    });

    return { deleted: true };
  }

  /**
   * Get class schedules
   */
  async getClassSchedules(classId: string) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity || classEntity.deletedAt) {
      throw AppError.notFound('Class not found');
    }

    return this.getSchedules({ classId });
  }

  /**
   * Get lecturer weekly schedule
   */
  async getLecturerSchedule(lecturerId: string, semesterId: string) {
    const schedules = await this.getSchedules({ lecturerId, semesterId });

    // Group by day
    const byDay: Record<number, typeof schedules> = {};
    for (let i = 0; i < 7; i++) {
      byDay[i] = [];
    }

    for (const schedule of schedules) {
      byDay[schedule.dayOfWeek].push(schedule);
    }

    return {
      schedules,
      byDay: Object.entries(byDay).map(([day, items]) => ({
        day: parseInt(day),
        dayName: DAYS_OF_WEEK[parseInt(day)],
        schedules: items,
      })),
    };
  }

  /**
   * Bulk create schedules for a class
   */
  async bulkCreateSchedules(
    classId: string,
    schedules: Omit<CreateScheduleInput, 'classId'>[],
    userId?: string
  ) {
    const results = [];

    for (const schedule of schedules) {
      const created = await this.createSchedule(
        { ...schedule, classId },
        userId
      );
      results.push(created);
    }

    return results;
  }

  /**
   * Copy schedules from one class to another
   */
  async copySchedules(sourceClassId: string, targetClassId: string, userId?: string) {
    const sourceSchedules = await this.getSchedules({ classId: sourceClassId });

    const results = [];
    const errors = [];

    for (const schedule of sourceSchedules) {
      try {
        const created = await this.createSchedule(
          {
            classId: targetClassId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            roomId: schedule.roomId || undefined,
            scheduleType: schedule.scheduleType,
          },
          userId
        );
        results.push(created);
      } catch (error) {
        errors.push({
          schedule: `${DAYS_OF_WEEK[schedule.dayOfWeek]} ${schedule.startTime}-${schedule.endTime}`,
          error: error instanceof AppError ? error.message : 'Unknown error',
        });
      }
    }

    return { created: results, errors };
  }
}

export const scheduleService = new ScheduleService();
