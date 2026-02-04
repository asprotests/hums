import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateFacultyInput,
  UpdateFacultyInput,
  FacultyQueryInput,
} from '../validators/academic.validator.js';

export class FacultyService {
  /**
   * Create a new faculty
   */
  async createFaculty(data: CreateFacultyInput, createdById?: string) {
    // Check if code already exists
    const existingCode = await prisma.faculty.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw AppError.conflict('Faculty with this code already exists');
    }

    // Verify dean exists if provided
    if (data.deanId) {
      const dean = await prisma.employee.findUnique({
        where: { id: data.deanId },
      });
      if (!dean) {
        throw AppError.badRequest('Invalid dean ID');
      }
    }

    const faculty = await prisma.faculty.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        deanId: data.deanId,
      },
      include: {
        dean: {
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
        _count: {
          select: { departments: true },
        },
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'Faculty', faculty.id, null, {
      name: faculty.name,
      code: faculty.code,
    });

    return this.formatFaculty(faculty);
  }

  /**
   * Get faculties with pagination and filters
   */
  async getFaculties(filters: FacultyQueryInput) {
    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.FacultyWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [faculties, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          dean: {
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
          _count: {
            select: { departments: true },
          },
        },
      }),
      prisma.faculty.count({ where }),
    ]);

    return {
      data: faculties.map(this.formatFaculty),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get faculty by ID
   */
  async getFacultyById(id: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id, deletedAt: null },
      include: {
        dean: {
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
        departments: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: { programs: true, courses: true },
            },
          },
        },
        _count: {
          select: { departments: true },
        },
      },
    });

    if (!faculty) {
      throw AppError.notFound('Faculty not found');
    }

    return this.formatFacultyWithDepartments(faculty);
  }

  /**
   * Update faculty
   */
  async updateFaculty(id: string, data: UpdateFacultyInput, updatedById?: string) {
    const existingFaculty = await prisma.faculty.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingFaculty) {
      throw AppError.notFound('Faculty not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingFaculty.code) {
      const codeExists = await prisma.faculty.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        throw AppError.conflict('Faculty with this code already exists');
      }
    }

    // Verify dean exists if provided
    if (data.deanId) {
      const dean = await prisma.employee.findUnique({
        where: { id: data.deanId },
      });
      if (!dean) {
        throw AppError.badRequest('Invalid dean ID');
      }
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        deanId: data.deanId,
      },
      include: {
        dean: {
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
        _count: {
          select: { departments: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Faculty', id,
      { name: existingFaculty.name, code: existingFaculty.code },
      { name: updatedFaculty.name, code: updatedFaculty.code }
    );

    return this.formatFaculty(updatedFaculty);
  }

  /**
   * Soft delete faculty
   */
  async deleteFaculty(id: string, deletedById?: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { departments: { where: { deletedAt: null } } },
        },
      },
    });

    if (!faculty) {
      throw AppError.notFound('Faculty not found');
    }

    if (faculty._count.departments > 0) {
      throw AppError.badRequest(
        `Cannot delete faculty. ${faculty._count.departments} department(s) are assigned to this faculty.`
      );
    }

    await prisma.faculty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Faculty', id, {
      name: faculty.name,
      code: faculty.code,
    }, null);

    return { message: 'Faculty deleted successfully' };
  }

  /**
   * Get departments for a faculty
   */
  async getDepartments(facultyId: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId, deletedAt: null },
    });

    if (!faculty) {
      throw AppError.notFound('Faculty not found');
    }

    const departments = await prisma.department.findMany({
      where: {
        facultyId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        hod: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { programs: true, courses: true },
        },
      },
    });

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      nameLocal: dept.nameLocal,
      code: dept.code,
      hod: dept.hod ? {
        id: dept.hod.id,
        name: `${dept.hod.user.firstName} ${dept.hod.user.lastName}`,
      } : null,
      programCount: dept._count.programs,
      courseCount: dept._count.courses,
    }));
  }

  /**
   * Get faculty statistics
   */
  async getFacultyStatistics(id: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id, deletedAt: null },
    });

    if (!faculty) {
      throw AppError.notFound('Faculty not found');
    }

    const departments = await prisma.department.findMany({
      where: { facultyId: id, deletedAt: null },
      select: { id: true },
    });

    const departmentIds = departments.map((d) => d.id);

    const [programCount, courseCount, studentCount, employeeCount] = await Promise.all([
      prisma.program.count({
        where: { departmentId: { in: departmentIds }, deletedAt: null },
      }),
      prisma.course.count({
        where: { departmentId: { in: departmentIds }, deletedAt: null },
      }),
      prisma.student.count({
        where: {
          program: { departmentId: { in: departmentIds } },
          deletedAt: null,
        },
      }),
      prisma.employee.count({
        where: { departmentId: { in: departmentIds }, deletedAt: null },
      }),
    ]);

    return {
      id: faculty.id,
      name: faculty.name,
      departmentCount: departments.length,
      programCount,
      courseCount,
      studentCount,
      employeeCount,
    };
  }

  // Private methods

  private formatFaculty(faculty: any) {
    return {
      id: faculty.id,
      name: faculty.name,
      nameLocal: faculty.nameLocal,
      code: faculty.code,
      dean: faculty.dean ? {
        id: faculty.dean.id,
        name: `${faculty.dean.user.firstName} ${faculty.dean.user.lastName}`,
        email: faculty.dean.user.email,
      } : null,
      departmentCount: faculty._count?.departments || 0,
      createdAt: faculty.createdAt,
      updatedAt: faculty.updatedAt,
    };
  }

  private formatFacultyWithDepartments(faculty: any) {
    return {
      ...this.formatFaculty(faculty),
      departments: faculty.departments?.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        nameLocal: dept.nameLocal,
        code: dept.code,
        programCount: dept._count?.programs || 0,
        courseCount: dept._count?.courses || 0,
      })) || [],
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

export const facultyService = new FacultyService();
