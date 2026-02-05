import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import { holdService } from './hold.service.js';
import { registrationPeriodService } from './registrationPeriod.service.js';
import type { EnrollmentStatus, Prisma } from '@hums/database';

export interface EnrollInput {
  studentId: string;
  classId: string;
  overridePrerequisites?: boolean;
  overrideReason?: string;
}

export interface DropInput {
  studentId: string;
  classId: string;
  reason?: string;
}

export interface EnrollmentFilters {
  studentId?: string;
  classId?: string;
  semesterId?: string;
  status?: EnrollmentStatus;
}

export interface BulkEnrollInput {
  classId: string;
  studentIds: string[];
}

export class EnrollmentService {
  /**
   * Enroll a student in a class
   */
  async enrollStudent(data: EnrollInput, userId?: string) {
    const { studentId, classId, overridePrerequisites, overrideReason } = data;

    // Get student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Check for registration holds
    const holdCheck = await holdService.hasRegistrationHold(studentId);
    if (holdCheck.hasHold) {
      throw AppError.forbidden(
        `Cannot register: Student has active holds: ${holdCheck.holds.map((h) => h.type).join(', ')}`
      );
    }

    // Get class with course and semester info
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: {
          include: {
            prerequisites: true,
          },
        },
        semester: true,
        enrollments: {
          where: { status: { not: 'DROPPED' } },
        },
        lecturer: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Check if class is open for enrollment
    if (classEntity.status !== 'OPEN') {
      throw AppError.badRequest(`Cannot enroll: Class is ${classEntity.status.toLowerCase()}`);
    }

    // Check registration period
    const registrationStatus = await registrationPeriodService.isRegistrationOpen(
      classEntity.semesterId
    );

    if (!registrationStatus.isOpen) {
      throw AppError.badRequest(`Registration is closed: ${registrationStatus.message}`);
    }

    // Check if student is already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId,
        status: { not: 'DROPPED' },
      },
    });

    if (existingEnrollment) {
      throw AppError.conflict('Student is already enrolled in this class');
    }

    // Check class capacity
    const currentEnrollment = classEntity.enrollments.length;
    if (currentEnrollment >= classEntity.capacity) {
      throw AppError.badRequest('Class is full');
    }

    // Check prerequisites (if not overridden)
    if (!overridePrerequisites && classEntity.course.prerequisites.length > 0) {
      const prereqCheck = await this.checkPrerequisites(studentId, classEntity.course.id);

      if (!prereqCheck.met) {
        throw AppError.badRequest(
          `Prerequisites not met: ${prereqCheck.missing.map((c) => c.code).join(', ')}`
        );
      }
    }

    // Record prerequisite override if applicable
    if (overridePrerequisites && overrideReason && userId) {
      const prereqs = classEntity.course.prerequisites;
      for (const prereq of prereqs) {
        await prisma.prerequisiteOverride.upsert({
          where: {
            studentId_courseId: {
              studentId,
              courseId: prereq.id,
            },
          },
          create: {
            studentId,
            courseId: prereq.id,
            approvedById: userId,
            reason: overrideReason,
          },
          update: {
            approvedById: userId,
            reason: overrideReason,
          },
        });
      }
    }

    // Check for schedule conflicts
    const conflictCheck = await this.checkScheduleConflicts(studentId, classId);
    if (conflictCheck.hasConflict) {
      throw AppError.conflict(
        `Schedule conflict with: ${conflictCheck.conflicts.map((c) => c.className).join(', ')}`
      );
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
        semesterId: classEntity.semesterId,
        status: 'REGISTERED',
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        class: {
          include: {
            course: true,
            semester: true,
            lecturer: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'Enrollment',
      resourceId: enrollment.id,
      newValues: enrollment,
    });

    return enrollment;
  }

  /**
   * Drop a student from a class
   */
  async dropStudent(data: DropInput, userId?: string) {
    const { studentId, classId, reason } = data;

    // Get enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId,
        status: { not: 'DROPPED' },
      },
      include: {
        class: {
          include: {
            course: true,
            semester: true,
          },
        },
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }

    // Update enrollment status
    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'DROPPED',
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        class: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Enrollment',
      resourceId: enrollment.id,
      oldValues: enrollment,
      newValues: { ...updated, dropReason: reason },
    });

    return updated;
  }

  /**
   * Get enrollments with filters
   */
  async getEnrollments(filters: EnrollmentFilters = {}) {
    const { studentId, classId, semesterId, status } = filters;

    const where: Prisma.EnrollmentWhereInput = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (classId) {
      where.classId = classId;
    }

    if (semesterId) {
      where.semesterId = semesterId;
    }

    if (status) {
      where.status = status;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        class: {
          include: {
            course: true,
            semester: true,
            lecturer: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            room: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments;
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollmentById(id: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            program: true,
          },
        },
        class: {
          include: {
            course: true,
            semester: true,
            lecturer: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            room: true,
            schedules: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }

    return enrollment;
  }

  /**
   * Get student's current schedule
   */
  async getStudentSchedule(studentId: string, semesterId?: string) {
    // If no semester specified, use current semester
    let semester = semesterId;
    if (!semester) {
      const currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true },
      });
      if (!currentSemester) {
        return [];
      }
      semester = currentSemester.id;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { not: 'DROPPED' },
        semesterId: semester,
      },
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            room: true,
            schedules: true,
          },
        },
      },
    });

    return enrollments;
  }

  /**
   * Check if student has met prerequisites for a course
   */
  async checkPrerequisites(
    studentId: string,
    courseId: string
  ): Promise<{
    met: boolean;
    missing: Array<{ id: string; code: string; name: string }>;
    overridden: Array<{ id: string; code: string; name: string }>;
  }> {
    // Get course prerequisites (self-relation)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        prerequisites: true,
      },
    });

    if (!course || course.prerequisites.length === 0) {
      return { met: true, missing: [], overridden: [] };
    }

    // Get student's completed courses (with passing grades)
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'COMPLETED',
      },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    const completedCourseIds = new Set(
      completedEnrollments.map((e) => e.class.courseId)
    );

    // Get prerequisite overrides for this student
    const overrides = await prisma.prerequisiteOverride.findMany({
      where: {
        studentId,
        courseId: { in: course.prerequisites.map((p) => p.id) },
      },
    });

    const overriddenCourseIds = new Set(overrides.map((o) => o.courseId));

    const missing: Array<{ id: string; code: string; name: string }> = [];
    const overridden: Array<{ id: string; code: string; name: string }> = [];

    for (const prereq of course.prerequisites) {
      if (overriddenCourseIds.has(prereq.id)) {
        overridden.push({
          id: prereq.id,
          code: prereq.code,
          name: prereq.name,
        });
      } else if (!completedCourseIds.has(prereq.id)) {
        missing.push({
          id: prereq.id,
          code: prereq.code,
          name: prereq.name,
        });
      }
    }

    return {
      met: missing.length === 0,
      missing,
      overridden,
    };
  }

  /**
   * Check for schedule conflicts
   */
  async checkScheduleConflicts(
    studentId: string,
    classId: string
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{ classId: string; className: string; scheduleDetails: string }>;
  }> {
    // Get the new class's schedules
    const newClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        schedules: true,
        course: true,
      },
    });

    if (!newClass || newClass.schedules.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    // Get student's current enrollments with schedules
    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { not: 'DROPPED' },
        semesterId: newClass.semesterId,
      },
      include: {
        class: {
          include: {
            schedules: true,
            course: true,
          },
        },
      },
    });

    const conflicts: Array<{ classId: string; className: string; scheduleDetails: string }> = [];

    for (const enrollment of currentEnrollments) {
      for (const existingSchedule of enrollment.class.schedules) {
        for (const newSchedule of newClass.schedules) {
          // Check if same day
          if (existingSchedule.dayOfWeek === newSchedule.dayOfWeek) {
            // Check time overlap
            const existingStart = this.timeToMinutes(existingSchedule.startTime);
            const existingEnd = this.timeToMinutes(existingSchedule.endTime);
            const newStart = this.timeToMinutes(newSchedule.startTime);
            const newEnd = this.timeToMinutes(newSchedule.endTime);

            if (
              (newStart >= existingStart && newStart < existingEnd) ||
              (newEnd > existingStart && newEnd <= existingEnd) ||
              (newStart <= existingStart && newEnd >= existingEnd)
            ) {
              conflicts.push({
                classId: enrollment.classId,
                className: enrollment.class.name,
                scheduleDetails: `${existingSchedule.dayOfWeek} ${existingSchedule.startTime}-${existingSchedule.endTime}`,
              });
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Bulk enroll students in a class
   */
  async bulkEnroll(data: BulkEnrollInput, userId?: string) {
    const { classId, studentIds } = data;

    const results: Array<{
      studentId: string;
      success: boolean;
      error?: string;
      enrollment?: any;
    }> = [];

    for (const studentId of studentIds) {
      try {
        const enrollment = await this.enrollStudent(
          { studentId, classId },
          userId
        );
        results.push({ studentId, success: true, enrollment });
      } catch (error: any) {
        results.push({
          studentId,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      total: studentIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get available classes for registration
   */
  async getAvailableClasses(studentId: string, semesterId?: string) {
    // Get current semester if not specified
    let semester = semesterId;
    if (!semester) {
      const currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true },
      });
      if (!currentSemester) {
        throw AppError.notFound('No current semester set');
      }
      semester = currentSemester.id;
    }

    // Get student's program
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { program: true },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Get all open classes for the semester
    const classes = await prisma.class.findMany({
      where: {
        semesterId: semester,
        status: 'OPEN',
      },
      include: {
        course: {
          include: {
            prerequisites: true,
          },
        },
        lecturer: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        room: true,
        schedules: true,
        enrollments: {
          where: { status: { not: 'DROPPED' } },
        },
      },
    });

    // Get student's current enrollments
    const enrolledClassIds = new Set(
      (
        await prisma.enrollment.findMany({
          where: {
            studentId,
            status: { not: 'DROPPED' },
            semesterId: semester,
          },
        })
      ).map((e) => e.classId)
    );

    // Process classes and add availability info
    const availableClasses = await Promise.all(
      classes.map(async (cls) => {
        const isEnrolled = enrolledClassIds.has(cls.id);
        const isFull = cls.enrollments.length >= cls.capacity;
        const prereqCheck = await this.checkPrerequisites(studentId, cls.courseId);
        const conflictCheck = isEnrolled
          ? { hasConflict: false, conflicts: [] }
          : await this.checkScheduleConflicts(studentId, cls.id);

        return {
          ...cls,
          enrollments: undefined, // Remove detailed enrollments
          enrollmentCount: cls.enrollments.length,
          availableSeats: cls.capacity - cls.enrollments.length,
          isEnrolled,
          isFull,
          prerequisitesMet: prereqCheck.met,
          missingPrerequisites: prereqCheck.missing,
          hasScheduleConflict: conflictCheck.hasConflict,
          scheduleConflicts: conflictCheck.conflicts,
          canEnroll: !isEnrolled && !isFull && prereqCheck.met && !conflictCheck.hasConflict,
        };
      })
    );

    return availableClasses;
  }

  /**
   * Helper to convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

export const enrollmentService = new EnrollmentService();
