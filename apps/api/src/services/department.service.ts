import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentQueryInput,
} from '../validators/academic.validator.js';

export class DepartmentService {
  /**
   * Create a new department
   */
  async createDepartment(data: CreateDepartmentInput, createdById?: string) {
    // Check if code already exists
    const existingCode = await prisma.department.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw AppError.conflict('Department with this code already exists');
    }

    // Verify faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: data.facultyId, deletedAt: null },
    });
    if (!faculty) {
      throw AppError.badRequest('Invalid faculty ID');
    }

    // Verify HOD exists if provided
    if (data.hodId) {
      const hod = await prisma.employee.findUnique({
        where: { id: data.hodId },
      });
      if (!hod) {
        throw AppError.badRequest('Invalid HOD ID');
      }
    }

    const department = await prisma.department.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        facultyId: data.facultyId,
        hodId: data.hodId,
      },
      include: {
        faculty: true,
        hod: {
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
          select: { programs: true, courses: true },
        },
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'Department', department.id, null, {
      name: department.name,
      code: department.code,
      facultyName: faculty.name,
    });

    return this.formatDepartment(department);
  }

  /**
   * Get departments with pagination and filters
   */
  async getDepartments(filters: DepartmentQueryInput) {
    const { search, facultyId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          faculty: true,
          hod: {
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
            select: { programs: true, courses: true },
          },
        },
      }),
      prisma.department.count({ where }),
    ]);

    return {
      data: departments.map(this.formatDepartment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: {
        faculty: true,
        hod: {
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
        programs: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: { students: true },
            },
          },
        },
        courses: {
          where: { deletedAt: null },
        },
        _count: {
          select: { programs: true, courses: true, employees: true },
        },
      },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    return this.formatDepartmentWithDetails(department);
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: UpdateDepartmentInput, updatedById?: string) {
    const existingDepartment = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: { faculty: true },
    });

    if (!existingDepartment) {
      throw AppError.notFound('Department not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingDepartment.code) {
      const codeExists = await prisma.department.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        throw AppError.conflict('Department with this code already exists');
      }
    }

    // Verify faculty exists if changing
    if (data.facultyId && data.facultyId !== existingDepartment.facultyId) {
      const faculty = await prisma.faculty.findUnique({
        where: { id: data.facultyId, deletedAt: null },
      });
      if (!faculty) {
        throw AppError.badRequest('Invalid faculty ID');
      }
    }

    // Verify HOD exists if provided
    if (data.hodId) {
      const hod = await prisma.employee.findUnique({
        where: { id: data.hodId },
      });
      if (!hod) {
        throw AppError.badRequest('Invalid HOD ID');
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        facultyId: data.facultyId,
        hodId: data.hodId,
      },
      include: {
        faculty: true,
        hod: {
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
          select: { programs: true, courses: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Department', id,
      { name: existingDepartment.name, code: existingDepartment.code },
      { name: updatedDepartment.name, code: updatedDepartment.code }
    );

    return this.formatDepartment(updatedDepartment);
  }

  /**
   * Soft delete department
   */
  async deleteDepartment(id: string, deletedById?: string) {
    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            programs: { where: { deletedAt: null } },
            courses: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    if (department._count.programs > 0) {
      throw AppError.badRequest(
        `Cannot delete department. ${department._count.programs} program(s) are assigned to this department.`
      );
    }

    if (department._count.courses > 0) {
      throw AppError.badRequest(
        `Cannot delete department. ${department._count.courses} course(s) are assigned to this department.`
      );
    }

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Department', id, {
      name: department.name,
      code: department.code,
    }, null);

    return { message: 'Department deleted successfully' };
  }

  /**
   * Get programs for a department
   */
  async getPrograms(departmentId: string) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId, deletedAt: null },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    const programs = await prisma.program.findMany({
      where: {
        departmentId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { students: true, curriculum: true },
        },
      },
    });

    return programs.map((program) => ({
      id: program.id,
      name: program.name,
      nameLocal: program.nameLocal,
      code: program.code,
      type: program.type,
      durationYears: program.durationYears,
      totalCredits: program.totalCredits,
      studentCount: program._count.students,
      courseCount: program._count.curriculum,
    }));
  }

  /**
   * Get courses for a department
   */
  async getCourses(departmentId: string) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId, deletedAt: null },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    const courses = await prisma.course.findMany({
      where: {
        departmentId,
        deletedAt: null,
      },
      orderBy: { code: 'asc' },
      include: {
        prerequisites: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return courses.map((course) => ({
      id: course.id,
      name: course.name,
      nameLocal: course.nameLocal,
      code: course.code,
      credits: course.credits,
      description: course.description,
      prerequisites: course.prerequisites.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })),
    }));
  }

  /**
   * Get employees for a department
   */
  async getEmployees(departmentId: string) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId, deletedAt: null },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    const employees = await prisma.employee.findMany({
      where: {
        departmentId,
        deletedAt: null,
      },
      orderBy: { user: { lastName: 'asc' } },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: `${emp.user.firstName} ${emp.user.lastName}`,
      email: emp.user.email,
      position: emp.position,
      employmentType: emp.employmentType,
    }));
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(id: string) {
    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
    });

    if (!department) {
      throw AppError.notFound('Department not found');
    }

    const [programCount, courseCount, studentCount, employeeCount] = await Promise.all([
      prisma.program.count({
        where: { departmentId: id, deletedAt: null },
      }),
      prisma.course.count({
        where: { departmentId: id, deletedAt: null },
      }),
      prisma.student.count({
        where: {
          program: { departmentId: id },
          deletedAt: null,
        },
      }),
      prisma.employee.count({
        where: { departmentId: id, deletedAt: null },
      }),
    ]);

    return {
      id: department.id,
      name: department.name,
      programCount,
      courseCount,
      studentCount,
      employeeCount,
    };
  }

  // Private methods

  private formatDepartment(department: any) {
    return {
      id: department.id,
      name: department.name,
      nameLocal: department.nameLocal,
      code: department.code,
      faculty: department.faculty ? {
        id: department.faculty.id,
        name: department.faculty.name,
        code: department.faculty.code,
      } : null,
      hod: department.hod ? {
        id: department.hod.id,
        name: `${department.hod.user.firstName} ${department.hod.user.lastName}`,
        email: department.hod.user.email,
      } : null,
      programCount: department._count?.programs || 0,
      courseCount: department._count?.courses || 0,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }

  private formatDepartmentWithDetails(department: any) {
    return {
      ...this.formatDepartment(department),
      employeeCount: department._count?.employees || 0,
      programs: department.programs?.map((program: any) => ({
        id: program.id,
        name: program.name,
        nameLocal: program.nameLocal,
        code: program.code,
        type: program.type,
        studentCount: program._count?.students || 0,
      })) || [],
      courses: department.courses?.map((course: any) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        credits: course.credits,
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

export const departmentService = new DepartmentService();
