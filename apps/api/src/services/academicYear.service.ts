import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from '../validators/academic.validator.js';

export class AcademicYearService {
  /**
   * Create a new academic year
   */
  async createAcademicYear(data: CreateAcademicYearInput, createdById?: string) {
    // Check if name already exists
    const existing = await prisma.academicYear.findFirst({
      where: { name: data.name },
    });
    if (existing) {
      throw AppError.conflict('Academic year with this name already exists');
    }

    // Check for overlapping dates
    const overlapping = await prisma.academicYear.findFirst({
      where: {
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        ],
      },
    });
    if (overlapping) {
      throw AppError.badRequest(`Date range overlaps with existing academic year: ${overlapping.name}`);
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: false,
      },
      include: {
        _count: {
          select: { semesters: true },
        },
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'AcademicYear', academicYear.id, null, {
      name: academicYear.name,
      startDate: academicYear.startDate,
      endDate: academicYear.endDate,
    });

    return this.formatAcademicYear(academicYear);
  }

  /**
   * Get all academic years
   */
  async getAcademicYears() {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { semesters: true },
        },
      },
    });

    return academicYears.map(this.formatAcademicYear);
  }

  /**
   * Get academic year by ID
   */
  async getAcademicYearById(id: string) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        semesters: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: { semesters: true },
        },
      },
    });

    if (!academicYear) {
      throw AppError.notFound('Academic year not found');
    }

    return this.formatAcademicYearWithSemesters(academicYear);
  }

  /**
   * Update academic year
   */
  async updateAcademicYear(id: string, data: UpdateAcademicYearInput, updatedById?: string) {
    const existingYear = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existingYear) {
      throw AppError.notFound('Academic year not found');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== existingYear.name) {
      const nameExists = await prisma.academicYear.findFirst({
        where: { name: data.name },
      });
      if (nameExists) {
        throw AppError.conflict('Academic year with this name already exists');
      }
    }

    // Check for overlapping dates if changing dates
    const newStartDate = data.startDate || existingYear.startDate;
    const newEndDate = data.endDate || existingYear.endDate;

    if (data.startDate || data.endDate) {
      const overlapping = await prisma.academicYear.findFirst({
        where: {
          id: { not: id },
          OR: [
            {
              startDate: { lte: newEndDate },
              endDate: { gte: newStartDate },
            },
          ],
        },
      });
      if (overlapping) {
        throw AppError.badRequest(`Date range overlaps with existing academic year: ${overlapping.name}`);
      }
    }

    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      include: {
        _count: {
          select: { semesters: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'AcademicYear', id,
      { name: existingYear.name, startDate: existingYear.startDate, endDate: existingYear.endDate },
      { name: updatedYear.name, startDate: updatedYear.startDate, endDate: updatedYear.endDate }
    );

    return this.formatAcademicYear(updatedYear);
  }

  /**
   * Delete academic year
   */
  async deleteAcademicYear(id: string, deletedById?: string) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: { semesters: true },
        },
      },
    });

    if (!academicYear) {
      throw AppError.notFound('Academic year not found');
    }

    if (academicYear._count.semesters > 0) {
      throw AppError.badRequest(
        `Cannot delete academic year. ${academicYear._count.semesters} semester(s) are assigned to this academic year.`
      );
    }

    if (academicYear.isCurrent) {
      throw AppError.badRequest('Cannot delete the current academic year. Set another year as current first.');
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'AcademicYear', id, {
      name: academicYear.name,
    }, null);

    return { message: 'Academic year deleted successfully' };
  }

  /**
   * Set academic year as current
   */
  async setCurrentAcademicYear(id: string, updatedById?: string) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw AppError.notFound('Academic year not found');
    }

    if (academicYear.isCurrent) {
      throw AppError.badRequest('This academic year is already set as current');
    }

    // Unset all other academic years as current
    await prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Set this academic year as current
    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
      include: {
        _count: {
          select: { semesters: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'SET_CURRENT', 'AcademicYear', id, null, {
      name: updatedYear.name,
      isCurrent: true,
    });

    return this.formatAcademicYear(updatedYear);
  }

  /**
   * Get semesters for an academic year
   */
  async getSemesters(academicYearId: string) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw AppError.notFound('Academic year not found');
    }

    const semesters = await prisma.semester.findMany({
      where: { academicYearId },
      orderBy: { startDate: 'asc' },
    });

    return semesters;
  }

  /**
   * Get current academic year
   */
  async getCurrentAcademicYear() {
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        semesters: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: { semesters: true },
        },
      },
    });

    if (!academicYear) {
      return null;
    }

    return this.formatAcademicYearWithSemesters(academicYear);
  }

  // Private methods

  private formatAcademicYear(academicYear: any) {
    return {
      id: academicYear.id,
      name: academicYear.name,
      startDate: academicYear.startDate,
      endDate: academicYear.endDate,
      isCurrent: academicYear.isCurrent,
      semesterCount: academicYear._count?.semesters || 0,
      createdAt: academicYear.createdAt,
      updatedAt: academicYear.updatedAt,
    };
  }

  private formatAcademicYearWithSemesters(academicYear: any) {
    return {
      ...this.formatAcademicYear(academicYear),
      semesters: academicYear.semesters || [],
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

export const academicYearService = new AcademicYearService();
