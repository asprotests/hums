import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type {
  CreateSemesterInput,
  UpdateSemesterInput,
  SemesterQueryInput,
} from '../validators/academic.validator.js';

export class SemesterService {
  /**
   * Create a new semester
   */
  async createSemester(data: CreateSemesterInput, createdById?: string) {
    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId },
    });
    if (!academicYear) {
      throw AppError.badRequest('Invalid academic year ID');
    }

    // Check if semester name already exists in this academic year
    const existing = await prisma.semester.findFirst({
      where: {
        name: data.name,
        academicYearId: data.academicYearId,
      },
    });
    if (existing) {
      throw AppError.conflict('Semester with this name already exists in this academic year');
    }

    // Check that semester dates fall within academic year dates
    if (data.startDate < academicYear.startDate || data.endDate > academicYear.endDate) {
      throw AppError.badRequest('Semester dates must fall within the academic year dates');
    }

    // Check for overlapping semesters in the same academic year
    const overlapping = await prisma.semester.findFirst({
      where: {
        academicYearId: data.academicYearId,
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        ],
      },
    });
    if (overlapping) {
      throw AppError.badRequest(`Date range overlaps with existing semester: ${overlapping.name}`);
    }

    const semester = await prisma.semester.create({
      data: {
        name: data.name,
        academicYearId: data.academicYearId,
        startDate: data.startDate,
        endDate: data.endDate,
        registrationStart: data.registrationStart,
        registrationEnd: data.registrationEnd,
        isCurrent: false,
      },
      include: {
        academicYear: true,
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'Semester', semester.id, null, {
      name: semester.name,
      academicYear: academicYear.name,
      startDate: semester.startDate,
      endDate: semester.endDate,
    });

    return this.formatSemester(semester);
  }

  /**
   * Get semesters with optional filters
   */
  async getSemesters(filters: SemesterQueryInput) {
    const where: any = {};

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    const semesters = await prisma.semester.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        academicYear: true,
        _count: {
          select: { classes: true },
        },
      },
    });

    return semesters.map(this.formatSemester);
  }

  /**
   * Get semester by ID
   */
  async getSemesterById(id: string) {
    const semester = await prisma.semester.findUnique({
      where: { id },
      include: {
        academicYear: true,
        _count: {
          select: { classes: true, enrollments: true },
        },
      },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    return this.formatSemesterWithCounts(semester);
  }

  /**
   * Update semester
   */
  async updateSemester(id: string, data: UpdateSemesterInput, updatedById?: string) {
    const existingSemester = await prisma.semester.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!existingSemester) {
      throw AppError.notFound('Semester not found');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== existingSemester.name) {
      const nameExists = await prisma.semester.findFirst({
        where: {
          name: data.name,
          academicYearId: existingSemester.academicYearId,
          id: { not: id },
        },
      });
      if (nameExists) {
        throw AppError.conflict('Semester with this name already exists in this academic year');
      }
    }

    // Check dates are within academic year if changing
    const newStartDate = data.startDate || existingSemester.startDate;
    const newEndDate = data.endDate || existingSemester.endDate;
    const academicYear = existingSemester.academicYear;

    if (newStartDate < academicYear.startDate || newEndDate > academicYear.endDate) {
      throw AppError.badRequest('Semester dates must fall within the academic year dates');
    }

    // Check for overlapping semesters if changing dates
    if (data.startDate || data.endDate) {
      const overlapping = await prisma.semester.findFirst({
        where: {
          id: { not: id },
          academicYearId: existingSemester.academicYearId,
          OR: [
            {
              startDate: { lte: newEndDate },
              endDate: { gte: newStartDate },
            },
          ],
        },
      });
      if (overlapping) {
        throw AppError.badRequest(`Date range overlaps with existing semester: ${overlapping.name}`);
      }
    }

    const updatedSemester = await prisma.semester.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        registrationStart: data.registrationStart,
        registrationEnd: data.registrationEnd,
      },
      include: {
        academicYear: true,
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Semester', id,
      { name: existingSemester.name, startDate: existingSemester.startDate },
      { name: updatedSemester.name, startDate: updatedSemester.startDate }
    );

    return this.formatSemester(updatedSemester);
  }

  /**
   * Delete semester
   */
  async deleteSemester(id: string, deletedById?: string) {
    const semester = await prisma.semester.findUnique({
      where: { id },
      include: {
        _count: {
          select: { classes: true, enrollments: true },
        },
      },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    if (semester._count.classes > 0) {
      throw AppError.badRequest(
        `Cannot delete semester. ${semester._count.classes} class(es) are scheduled for this semester.`
      );
    }

    if (semester._count.enrollments > 0) {
      throw AppError.badRequest(
        `Cannot delete semester. ${semester._count.enrollments} enrollment(s) exist for this semester.`
      );
    }

    if (semester.isCurrent) {
      throw AppError.badRequest('Cannot delete the current semester. Set another semester as current first.');
    }

    await prisma.semester.delete({
      where: { id },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Semester', id, {
      name: semester.name,
    }, null);

    return { message: 'Semester deleted successfully' };
  }

  /**
   * Set semester as current
   */
  async setCurrentSemester(id: string, updatedById?: string) {
    const semester = await prisma.semester.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!semester) {
      throw AppError.notFound('Semester not found');
    }

    if (semester.isCurrent) {
      throw AppError.badRequest('This semester is already set as current');
    }

    // Unset all other semesters as current
    await prisma.semester.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Set this semester as current
    const updatedSemester = await prisma.semester.update({
      where: { id },
      data: { isCurrent: true },
      include: {
        academicYear: true,
      },
    });

    // Also set the academic year as current if it isn't already
    if (!semester.academicYear.isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      await prisma.academicYear.update({
        where: { id: semester.academicYearId },
        data: { isCurrent: true },
      });
    }

    await this.createAuditLog(updatedById, 'SET_CURRENT', 'Semester', id, null, {
      name: updatedSemester.name,
      isCurrent: true,
    });

    return this.formatSemester(updatedSemester);
  }

  /**
   * Get current semester
   */
  async getCurrentSemester() {
    const semester = await prisma.semester.findFirst({
      where: { isCurrent: true },
      include: {
        academicYear: true,
        _count: {
          select: { classes: true, enrollments: true },
        },
      },
    });

    if (!semester) {
      return null;
    }

    return this.formatSemesterWithCounts(semester);
  }

  /**
   * Check if currently in registration period
   */
  async isRegistrationOpen() {
    const semester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    if (!semester) {
      return { isOpen: false, message: 'No current semester set' };
    }

    const now = new Date();
    const isOpen = now >= semester.registrationStart && now <= semester.registrationEnd;

    return {
      isOpen,
      semester: semester.name,
      registrationStart: semester.registrationStart,
      registrationEnd: semester.registrationEnd,
      message: isOpen
        ? 'Registration is currently open'
        : now < semester.registrationStart
          ? 'Registration has not started yet'
          : 'Registration has ended',
    };
  }

  // Private methods

  private formatSemester(semester: any) {
    return {
      id: semester.id,
      name: semester.name,
      academicYearId: semester.academicYearId,
      academicYear: semester.academicYear ? {
        id: semester.academicYear.id,
        name: semester.academicYear.name,
      } : undefined,
      startDate: semester.startDate,
      endDate: semester.endDate,
      registrationStart: semester.registrationStart,
      registrationEnd: semester.registrationEnd,
      isCurrent: semester.isCurrent,
      classCount: semester._count?.classes || 0,
      createdAt: semester.createdAt,
      updatedAt: semester.updatedAt,
    };
  }

  private formatSemesterWithCounts(semester: any) {
    return {
      ...this.formatSemester(semester),
      enrollmentCount: semester._count?.enrollments || 0,
    };
  }

  private async createAuditLog(
    userId: string | null | undefined,
    action: string,
    resource: string,
    resourceId: string | null,
    oldValues: any,
    newValues: any
  ) {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
      },
    });
  }
}

export const semesterService = new SemesterService();
