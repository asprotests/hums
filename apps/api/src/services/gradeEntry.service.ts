import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';

export interface GradeEntryInput {
  enrollmentId: string;
  score: number;
  remarks?: string;
}

export class GradeEntryService {
  /**
   * Enter grades for a component (bulk)
   */
  async enterGrades(
    componentId: string,
    grades: GradeEntryInput[],
    enteredById: string
  ) {
    // Verify component exists
    const component = await prisma.gradeComponent.findUnique({
      where: { id: componentId },
      include: {
        class: {
          include: {
            enrollments: { where: { status: 'REGISTERED' } },
          },
        },
      },
    });

    if (!component) {
      throw AppError.notFound('Grade component not found');
    }

    // Check if grades are finalized
    const finalizedEnrollments = await prisma.enrollment.findMany({
      where: {
        classId: component.classId,
        isFinalized: true,
        id: { in: grades.map((g) => g.enrollmentId) },
      },
    });

    if (finalizedEnrollments.length > 0) {
      throw AppError.badRequest('Cannot modify grades for finalized enrollments');
    }

    const maxScore = Number(component.maxScore);
    const createdEntries = [];

    for (const grade of grades) {
      // Validate score
      if (grade.score < 0 || grade.score > maxScore) {
        throw AppError.badRequest(
          `Invalid score for enrollment ${grade.enrollmentId}. Score must be between 0 and ${maxScore}`
        );
      }

      // Verify enrollment exists and is for this class
      const enrollment = component.class.enrollments.find(
        (e) => e.id === grade.enrollmentId
      );

      if (!enrollment) {
        continue; // Skip invalid enrollments
      }

      const entry = await prisma.gradeEntry.upsert({
        where: {
          componentId_enrollmentId: {
            componentId,
            enrollmentId: grade.enrollmentId,
          },
        },
        update: {
          score: grade.score,
          remarks: grade.remarks,
          modifiedById: enteredById,
          modifiedAt: new Date(),
        },
        create: {
          componentId,
          enrollmentId: grade.enrollmentId,
          score: grade.score,
          remarks: grade.remarks,
          enteredById,
        },
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      });

      createdEntries.push(entry);
    }

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'GradeEntry',
      resourceId: componentId,
      userId: enteredById,
      newValues: { componentId, entriesCount: createdEntries.length },
    });

    return createdEntries;
  }

  /**
   * Get all grades for a component
   */
  async getComponentGrades(componentId: string) {
    const component = await prisma.gradeComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw AppError.notFound('Grade component not found');
    }

    const entries = await prisma.gradeEntry.findMany({
      where: { componentId },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        enteredBy: { select: { firstName: true, lastName: true } },
        modifiedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: {
        enrollment: {
          student: {
            user: { firstName: 'asc' },
          },
        },
      },
    });

    // Also get enrolled students without grades for this component
    const enrolledWithoutGrades = await prisma.enrollment.findMany({
      where: {
        classId: component.classId,
        status: 'REGISTERED',
        gradeEntries: {
          none: { componentId },
        },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return {
      component: {
        id: component.id,
        name: component.name,
        type: component.type,
        maxScore: Number(component.maxScore),
        weight: Number(component.weight),
        isPublished: component.isPublished,
      },
      entries,
      enrolledWithoutGrades,
      statistics: this.calculateStatistics(entries, Number(component.maxScore)),
    };
  }

  /**
   * Get grades for a student (enrollment)
   */
  async getStudentGrades(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          include: {
            gradeComponents: true,
          },
        },
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }

    const entries = await prisma.gradeEntry.findMany({
      where: { enrollmentId },
      include: {
        component: true,
      },
    });

    return {
      enrollment,
      entries: entries.map((e) => ({
        ...e,
        score: Number(e.score),
        component: {
          ...e.component,
          maxScore: Number(e.component.maxScore),
          weight: Number(e.component.weight),
        },
      })),
    };
  }

  /**
   * Update a single grade entry
   */
  async updateGrade(
    entryId: string,
    score: number,
    remarks: string | undefined,
    modifiedById: string
  ) {
    const existing = await prisma.gradeEntry.findUnique({
      where: { id: entryId },
      include: {
        component: true,
        enrollment: true,
      },
    });

    if (!existing) {
      throw AppError.notFound('Grade entry not found');
    }

    // Check if enrollment is finalized
    if (existing.enrollment.isFinalized) {
      throw AppError.badRequest('Cannot modify grades for finalized enrollment');
    }

    const maxScore = Number(existing.component.maxScore);

    if (score < 0 || score > maxScore) {
      throw AppError.badRequest(`Score must be between 0 and ${maxScore}`);
    }

    const entry = await prisma.gradeEntry.update({
      where: { id: entryId },
      data: {
        score,
        remarks,
        modifiedById,
        modifiedAt: new Date(),
      },
      include: {
        component: true,
        enrollment: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'GradeEntry',
      resourceId: entryId,
      userId: modifiedById,
      oldValues: { score: Number(existing.score) },
      newValues: { score },
    });

    return entry;
  }

  /**
   * Delete a grade entry
   */
  async deleteGrade(entryId: string, userId: string) {
    const existing = await prisma.gradeEntry.findUnique({
      where: { id: entryId },
      include: { enrollment: true },
    });

    if (!existing) {
      throw AppError.notFound('Grade entry not found');
    }

    if (existing.enrollment.isFinalized) {
      throw AppError.badRequest('Cannot delete grades for finalized enrollment');
    }

    await prisma.gradeEntry.delete({
      where: { id: entryId },
    });

    await auditService.log({
      action: AuditAction.DELETE,
      resource: 'GradeEntry',
      resourceId: entryId,
      userId,
      oldValues: { score: Number(existing.score), enrollmentId: existing.enrollmentId },
    });
  }

  /**
   * Calculate statistics for grade entries
   */
  private calculateStatistics(
    entries: Array<{ score: any }>,
    maxScore: number
  ) {
    if (entries.length === 0) {
      return {
        count: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        median: 0,
      };
    }

    const scores = entries.map((e) => Number(e.score));
    const sorted = [...scores].sort((a, b) => a - b);

    return {
      count: scores.length,
      average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      median:
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)],
      maxScore,
    };
  }
}

export const gradeEntryService = new GradeEntryService();
