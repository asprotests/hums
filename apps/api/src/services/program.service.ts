import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  ProgramQueryInput,
  AddCurriculumCourseInput,
} from '../validators/academic.validator.js';

export class ProgramService {
  /**
   * Create a new program
   */
  async createProgram(data: CreateProgramInput, createdById?: string) {
    // Check if code already exists
    const existingCode = await prisma.program.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw AppError.conflict('Program with this code already exists');
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId, deletedAt: null },
      include: { faculty: true },
    });
    if (!department) {
      throw AppError.badRequest('Invalid department ID');
    }

    const program = await prisma.program.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        type: data.type,
        durationYears: data.durationYears,
        totalCredits: data.totalCredits,
        departmentId: data.departmentId,
      },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        _count: {
          select: { students: true, curriculum: true },
        },
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'Program', program.id, null, {
      name: program.name,
      code: program.code,
      type: program.type,
      departmentName: department.name,
    });

    return this.formatProgram(program);
  }

  /**
   * Get programs with pagination and filters
   */
  async getPrograms(filters: ProgramQueryInput) {
    const { search, departmentId, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProgramWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (type) {
      where.type = type;
    }

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          department: {
            include: {
              faculty: true,
            },
          },
          _count: {
            select: { students: true, curriculum: true },
          },
        },
      }),
      prisma.program.count({ where }),
    ]);

    return {
      data: programs.map(this.formatProgram),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get program by ID
   */
  async getProgramById(id: string) {
    const program = await prisma.program.findUnique({
      where: { id, deletedAt: null },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        curriculum: {
          include: {
            course: true,
          },
          orderBy: [{ semester: 'asc' }, { course: { code: 'asc' } }],
        },
        _count: {
          select: { students: true, curriculum: true },
        },
      },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    return this.formatProgramWithCurriculum(program);
  }

  /**
   * Update program
   */
  async updateProgram(id: string, data: UpdateProgramInput, updatedById?: string) {
    const existingProgram = await prisma.program.findUnique({
      where: { id, deletedAt: null },
      include: { department: true },
    });

    if (!existingProgram) {
      throw AppError.notFound('Program not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingProgram.code) {
      const codeExists = await prisma.program.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        throw AppError.conflict('Program with this code already exists');
      }
    }

    // Verify department exists if changing
    if (data.departmentId && data.departmentId !== existingProgram.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId, deletedAt: null },
      });
      if (!department) {
        throw AppError.badRequest('Invalid department ID');
      }
    }

    const updatedProgram = await prisma.program.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        type: data.type,
        durationYears: data.durationYears,
        totalCredits: data.totalCredits,
        departmentId: data.departmentId,
      },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        _count: {
          select: { students: true, curriculum: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Program', id,
      { name: existingProgram.name, code: existingProgram.code, type: existingProgram.type },
      { name: updatedProgram.name, code: updatedProgram.code, type: updatedProgram.type }
    );

    return this.formatProgram(updatedProgram);
  }

  /**
   * Soft delete program
   */
  async deleteProgram(id: string, deletedById?: string) {
    const program = await prisma.program.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            students: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    if (program._count.students > 0) {
      throw AppError.badRequest(
        `Cannot delete program. ${program._count.students} student(s) are enrolled in this program.`
      );
    }

    // Delete curriculum entries first
    await prisma.curriculum.deleteMany({
      where: { programId: id },
    });

    await prisma.program.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Program', id, {
      name: program.name,
      code: program.code,
    }, null);

    return { message: 'Program deleted successfully' };
  }

  /**
   * Get curriculum for a program
   */
  async getCurriculum(programId: string) {
    const program = await prisma.program.findUnique({
      where: { id: programId, deletedAt: null },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    const curriculum = await prisma.curriculum.findMany({
      where: { programId },
      include: {
        course: {
          include: {
            prerequisites: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: [{ semester: 'asc' }, { course: { code: 'asc' } }],
    });

    // Group by semester
    const bySemester: Record<number, any[]> = {};
    curriculum.forEach((item) => {
      if (!bySemester[item.semester]) {
        bySemester[item.semester] = [];
      }
      bySemester[item.semester].push({
        courseId: item.courseId,
        code: item.course.code,
        name: item.course.name,
        nameLocal: item.course.nameLocal,
        credits: item.course.credits,
        isRequired: item.isRequired,
        prerequisites: item.course.prerequisites.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
        })),
      });
    });

    return {
      programId,
      programName: program.name,
      programCode: program.code,
      totalCredits: program.totalCredits,
      semesters: Object.entries(bySemester).map(([semester, courses]) => ({
        semester: parseInt(semester),
        courses,
        totalCredits: courses.reduce((sum, c) => sum + c.credits, 0),
      })),
    };
  }

  /**
   * Add course to curriculum
   */
  async addCurriculumCourse(programId: string, data: AddCurriculumCourseInput, addedById?: string) {
    const program = await prisma.program.findUnique({
      where: { id: programId, deletedAt: null },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId, deletedAt: null },
    });

    if (!course) {
      throw AppError.badRequest('Invalid course ID');
    }

    // Check if course is already in curriculum
    const existing = await prisma.curriculum.findUnique({
      where: {
        programId_courseId: {
          programId,
          courseId: data.courseId,
        },
      },
    });

    if (existing) {
      throw AppError.conflict('Course is already in this program curriculum');
    }

    const curriculumEntry = await prisma.curriculum.create({
      data: {
        programId,
        courseId: data.courseId,
        semester: data.semester,
        isRequired: data.isRequired ?? true,
      },
      include: {
        course: true,
      },
    });

    await this.createAuditLog(addedById, 'ADD_CURRICULUM', 'Program', programId, null, {
      courseCode: course.code,
      courseName: course.name,
      semester: data.semester,
    });

    return {
      courseId: curriculumEntry.courseId,
      code: curriculumEntry.course.code,
      name: curriculumEntry.course.name,
      credits: curriculumEntry.course.credits,
      semester: curriculumEntry.semester,
      isRequired: curriculumEntry.isRequired,
    };
  }

  /**
   * Remove course from curriculum
   */
  async removeCurriculumCourse(programId: string, courseId: string, removedById?: string) {
    const program = await prisma.program.findUnique({
      where: { id: programId, deletedAt: null },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    const curriculumEntry = await prisma.curriculum.findUnique({
      where: {
        programId_courseId: {
          programId,
          courseId,
        },
      },
      include: { course: true },
    });

    if (!curriculumEntry) {
      throw AppError.notFound('Course not found in this program curriculum');
    }

    await prisma.curriculum.delete({
      where: {
        programId_courseId: {
          programId,
          courseId,
        },
      },
    });

    await this.createAuditLog(removedById, 'REMOVE_CURRICULUM', 'Program', programId, {
      courseCode: curriculumEntry.course.code,
      courseName: curriculumEntry.course.name,
    }, null);

    return { message: 'Course removed from curriculum successfully' };
  }

  /**
   * Get students for a program
   */
  async getStudents(programId: string, page = 1, limit = 20) {
    const program = await prisma.program.findUnique({
      where: { id: programId, deletedAt: null },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: {
          programId,
          deletedAt: null,
        },
        skip,
        take: limit,
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
      }),
      prisma.student.count({
        where: { programId, deletedAt: null },
      }),
    ]);

    return {
      data: students.map((student) => ({
        id: student.id,
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        admissionDate: student.admissionDate,
        status: student.status,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get program statistics
   */
  async getProgramStatistics(id: string) {
    const program = await prisma.program.findUnique({
      where: { id, deletedAt: null },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    const [studentCount, courseCount, graduatedCount] = await Promise.all([
      prisma.student.count({
        where: { programId: id, deletedAt: null },
      }),
      prisma.curriculum.count({
        where: { programId: id },
      }),
      prisma.student.count({
        where: { programId: id, status: 'GRADUATED', deletedAt: null },
      }),
    ]);

    return {
      id: program.id,
      name: program.name,
      studentCount,
      courseCount,
      graduatedCount,
      activeStudents: studentCount - graduatedCount,
    };
  }

  // Private methods

  private formatProgram(program: any) {
    return {
      id: program.id,
      name: program.name,
      nameLocal: program.nameLocal,
      code: program.code,
      type: program.type,
      durationYears: program.durationYears,
      totalCredits: program.totalCredits,
      department: program.department ? {
        id: program.department.id,
        name: program.department.name,
        code: program.department.code,
        faculty: program.department.faculty ? {
          id: program.department.faculty.id,
          name: program.department.faculty.name,
        } : null,
      } : null,
      studentCount: program._count?.students || 0,
      courseCount: program._count?.curriculum || 0,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }

  private formatProgramWithCurriculum(program: any) {
    return {
      ...this.formatProgram(program),
      curriculum: program.curriculum?.map((item: any) => ({
        courseId: item.course.id,
        code: item.course.code,
        name: item.course.name,
        nameLocal: item.course.nameLocal,
        credits: item.course.credits,
        semester: item.semester,
        isRequired: item.isRequired,
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

export const programService = new ProgramService();
