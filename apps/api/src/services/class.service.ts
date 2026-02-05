import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { Prisma, ClassStatus } from '@hums/database';

export interface CreateClassInput {
  courseId: string;
  semesterId: string;
  lecturerId: string;
  capacity: number;
  name?: string;
  roomId?: string;
}

export interface UpdateClassInput {
  name?: string;
  lecturerId?: string;
  capacity?: number;
  roomId?: string | null;
  status?: ClassStatus;
}

export interface ClassFilters {
  semesterId?: string;
  courseId?: string;
  lecturerId?: string;
  status?: ClassStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class ClassService {
  /**
   * Generate class name (e.g., CS101-A, CS101-B)
   */
  private async generateClassName(courseId: string, semesterId: string): Promise<string> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { code: true },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    // Count existing classes for this course in this semester
    const existingCount = await prisma.class.count({
      where: {
        courseId,
        semesterId,
        deletedAt: null,
      },
    });

    // Generate section letter (A, B, C, ...)
    const sectionLetter = String.fromCharCode(65 + existingCount); // 65 = 'A'
    return `${course.code}-${sectionLetter}`;
  }

  /**
   * Create a new class
   */
  async createClass(data: CreateClassInput, userId?: string) {
    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course || course.deletedAt) {
      throw AppError.notFound('Course not found');
    }

    // Verify semester exists
    const semester = await prisma.semester.findUnique({
      where: { id: data.semesterId },
    });
    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    // Verify lecturer exists
    const lecturer = await prisma.employee.findUnique({
      where: { id: data.lecturerId },
    });
    if (!lecturer || lecturer.deletedAt) {
      throw AppError.notFound('Lecturer not found');
    }

    // Verify room if provided
    if (data.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });
      if (!room || room.deletedAt) {
        throw AppError.notFound('Room not found');
      }
    }

    // Generate name if not provided
    const name = data.name || await this.generateClassName(data.courseId, data.semesterId);

    const classEntity = await prisma.class.create({
      data: {
        name,
        courseId: data.courseId,
        semesterId: data.semesterId,
        lecturerId: data.lecturerId,
        capacity: data.capacity,
        roomId: data.roomId,
        status: 'OPEN',
      },
      include: {
        course: true,
        semester: true,
        lecturer: true,
        room: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'Class',
      resourceId: classEntity.id,
      newValues: classEntity,
    });

    return classEntity;
  }

  /**
   * Get classes with filters and pagination
   */
  async getClasses(filters: ClassFilters = {}) {
    const {
      semesterId,
      courseId,
      lecturerId,
      status,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.ClassWhereInput = {
      deletedAt: null,
    };

    if (semesterId) {
      where.semesterId = semesterId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (lecturerId) {
      where.lecturerId = lecturerId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { course: { name: { contains: search, mode: 'insensitive' } } },
        { course: { code: { contains: search, mode: 'insensitive' } } },
        { lecturer: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
        { lecturer: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
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
          room: true,
          _count: {
            select: {
              enrollments: {
                where: { status: 'REGISTERED' },
              },
            },
          },
        },
        orderBy: [{ course: { code: 'asc' } }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.class.count({ where }),
    ]);

    // Transform to include enrolledCount
    const classesWithCount = classes.map((c) => ({
      ...c,
      enrolledCount: c._count.enrollments,
      _count: undefined,
    }));

    return {
      data: classesWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get class by ID
   */
  async getClassById(id: string) {
    const classEntity = await prisma.class.findUnique({
      where: { id },
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
        room: true,
        schedules: {
          include: {
            room: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'REGISTERED' },
            },
          },
        },
      },
    });

    if (!classEntity || classEntity.deletedAt) {
      throw AppError.notFound('Class not found');
    }

    return {
      ...classEntity,
      enrolledCount: classEntity._count.enrollments,
      _count: undefined,
    };
  }

  /**
   * Update class
   */
  async updateClass(id: string, data: UpdateClassInput, userId?: string) {
    const classEntity = await this.getClassById(id);

    // Verify lecturer if changing
    if (data.lecturerId && data.lecturerId !== classEntity.lecturerId) {
      const lecturer = await prisma.employee.findUnique({
        where: { id: data.lecturerId },
      });
      if (!lecturer || lecturer.deletedAt) {
        throw AppError.notFound('Lecturer not found');
      }
    }

    // Verify room if changing
    if (data.roomId && data.roomId !== classEntity.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });
      if (!room || room.deletedAt) {
        throw AppError.notFound('Room not found');
      }
    }

    const updated = await prisma.class.update({
      where: { id },
      data,
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
        room: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Class',
      resourceId: id,
      oldValues: classEntity,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Delete class (soft delete)
   */
  async deleteClass(id: string, userId?: string) {
    const classEntity = await this.getClassById(id);

    // Check if class has enrollments
    if (classEntity.enrolledCount > 0) {
      throw AppError.conflict('Cannot delete class with enrolled students. Cancel the class instead.');
    }

    // Delete schedules first
    await prisma.schedule.deleteMany({
      where: { classId: id },
    });

    const deleted = await prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'Class',
      resourceId: id,
      oldValues: classEntity,
    });

    return deleted;
  }

  /**
   * Cancel class
   */
  async cancelClass(id: string, reason: string, userId?: string) {
    const classEntity = await this.getClassById(id);

    if (classEntity.status === 'CANCELLED') {
      throw AppError.badRequest('Class is already cancelled');
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
      },
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
        room: true,
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Class',
      resourceId: id,
      oldValues: { status: classEntity.status },
      newValues: { status: 'CANCELLED', cancelReason: reason },
    });

    return updated;
  }

  /**
   * Get students enrolled in a class
   */
  async getClassStudents(id: string) {
    await this.getClassById(id);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId: id,
        status: 'REGISTERED',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            program: true,
          },
        },
      },
      orderBy: {
        student: {
          user: {
            lastName: 'asc',
          },
        },
      },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      student: {
        id: e.student.id,
        studentId: e.student.studentId,
        firstName: e.student.user.firstName,
        lastName: e.student.user.lastName,
        email: e.student.user.email,
        program: e.student.program?.name,
      },
      enrolledAt: e.createdAt,
    }));
  }

  /**
   * Split class into a new section
   */
  async splitClass(id: string, userId?: string) {
    const classEntity = await this.getClassById(id);

    // Create a new class with the same course, semester, and lecturer
    const newClass = await this.createClass(
      {
        courseId: classEntity.courseId,
        semesterId: classEntity.semesterId,
        lecturerId: classEntity.lecturerId,
        capacity: classEntity.capacity,
      },
      userId
    );

    return newClass;
  }

  /**
   * Assign lecturer to class
   */
  async assignLecturer(id: string, lecturerId: string, userId?: string) {
    return this.updateClass(id, { lecturerId }, userId);
  }

  /**
   * Assign room to class
   */
  async assignRoom(id: string, roomId: string | null, userId?: string) {
    return this.updateClass(id, { roomId }, userId);
  }

  /**
   * Close class (prevent new enrollments)
   */
  async closeClass(id: string, userId?: string) {
    const classEntity = await this.getClassById(id);

    if (classEntity.status !== 'OPEN') {
      throw AppError.badRequest('Only open classes can be closed');
    }

    return this.updateClass(id, { status: 'CLOSED' }, userId);
  }

  /**
   * Reopen class
   */
  async reopenClass(id: string, userId?: string) {
    const classEntity = await this.getClassById(id);

    if (classEntity.status !== 'CLOSED') {
      throw AppError.badRequest('Only closed classes can be reopened');
    }

    return this.updateClass(id, { status: 'OPEN' }, userId);
  }
}

export const classService = new ClassService();
