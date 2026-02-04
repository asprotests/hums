import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CourseQueryInput,
} from '../validators/academic.validator.js';

export class CourseService {
  /**
   * Create a new course
   */
  async createCourse(data: CreateCourseInput, createdById?: string) {
    // Check if code already exists
    const existingCode = await prisma.course.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw AppError.conflict('Course with this code already exists');
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId, deletedAt: null },
    });
    if (!department) {
      throw AppError.badRequest('Invalid department ID');
    }

    // Verify prerequisites exist if provided
    if (data.prerequisiteIds && data.prerequisiteIds.length > 0) {
      const prereqs = await prisma.course.findMany({
        where: {
          id: { in: data.prerequisiteIds },
          deletedAt: null,
        },
      });
      if (prereqs.length !== data.prerequisiteIds.length) {
        throw AppError.badRequest('One or more invalid prerequisite course IDs');
      }
    }

    const course = await prisma.course.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        credits: data.credits,
        description: data.description,
        departmentId: data.departmentId,
        prerequisites: data.prerequisiteIds && data.prerequisiteIds.length > 0
          ? {
              connect: data.prerequisiteIds.map((prereqId) => ({ id: prereqId })),
            }
          : undefined,
      },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        prerequisites: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'Course', course.id, null, {
      name: course.name,
      code: course.code,
      credits: course.credits,
      departmentName: department.name,
    });

    return this.formatCourse(course);
  }

  /**
   * Get courses with pagination and filters
   */
  async getCourses(filters: CourseQueryInput) {
    const { search, departmentId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
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

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          department: {
            include: {
              faculty: true,
            },
          },
          prerequisites: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { classes: true, curriculum: true },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      data: courses.map(this.formatCourse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course by ID
   */
  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        prerequisites: {
          select: { id: true, code: true, name: true },
        },
        prerequisiteFor: {
          select: { id: true, code: true, name: true },
        },
        curriculum: {
          include: {
            program: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        _count: {
          select: { classes: true, curriculum: true },
        },
      },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    return this.formatCourseWithDetails(course);
  }

  /**
   * Update course
   */
  async updateCourse(id: string, data: UpdateCourseInput, updatedById?: string) {
    const existingCourse = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: { department: true },
    });

    if (!existingCourse) {
      throw AppError.notFound('Course not found');
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingCourse.code) {
      const codeExists = await prisma.course.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        throw AppError.conflict('Course with this code already exists');
      }
    }

    // Verify department exists if changing
    if (data.departmentId && data.departmentId !== existingCourse.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId, deletedAt: null },
      });
      if (!department) {
        throw AppError.badRequest('Invalid department ID');
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code,
        credits: data.credits,
        description: data.description,
        departmentId: data.departmentId,
      },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        prerequisites: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Course', id,
      { name: existingCourse.name, code: existingCourse.code, credits: existingCourse.credits },
      { name: updatedCourse.name, code: updatedCourse.code, credits: updatedCourse.credits }
    );

    return this.formatCourse(updatedCourse);
  }

  /**
   * Soft delete course
   */
  async deleteCourse(id: string, deletedById?: string) {
    const course = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            curriculum: true,
            classes: true,
          },
        },
      },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    if (course._count.curriculum > 0) {
      throw AppError.badRequest(
        `Cannot delete course. It is used in ${course._count.curriculum} program curriculum(s).`
      );
    }

    if (course._count.classes > 0) {
      throw AppError.badRequest(
        `Cannot delete course. It has ${course._count.classes} scheduled class(es).`
      );
    }

    // Disconnect prerequisite relationships before soft delete
    await prisma.course.update({
      where: { id },
      data: {
        prerequisites: { set: [] },
        prerequisiteFor: { set: [] },
        deletedAt: new Date(),
      },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Course', id, {
      name: course.name,
      code: course.code,
    }, null);

    return { message: 'Course deleted successfully' };
  }

  /**
   * Add prerequisite to course
   */
  async addPrerequisite(courseId: string, prerequisiteId: string, addedById?: string) {
    // Prevent self-referencing
    if (courseId === prerequisiteId) {
      throw AppError.badRequest('A course cannot be its own prerequisite');
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, deletedAt: null },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const prerequisite = await prisma.course.findUnique({
      where: { id: prerequisiteId, deletedAt: null },
    });

    if (!prerequisite) {
      throw AppError.badRequest('Invalid prerequisite course ID');
    }

    // Check for existing prerequisite
    const courseWithPrereqs = await prisma.course.findUnique({
      where: { id: courseId },
      include: { prerequisites: { select: { id: true } } },
    });

    if (courseWithPrereqs?.prerequisites.some(p => p.id === prerequisiteId)) {
      throw AppError.conflict('This prerequisite already exists for this course');
    }

    // Check for circular dependency
    const hasCircular = await this.checkCircularDependency(courseId, prerequisiteId);
    if (hasCircular) {
      throw AppError.badRequest('Adding this prerequisite would create a circular dependency');
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        prerequisites: { connect: { id: prerequisiteId } },
      },
    });

    await this.createAuditLog(addedById, 'ADD_PREREQUISITE', 'Course', courseId, null, {
      courseCode: course.code,
      prerequisiteCode: prerequisite.code,
    });

    return {
      message: 'Prerequisite added successfully',
      course: { id: course.id, code: course.code },
      prerequisite: { id: prerequisite.id, code: prerequisite.code },
    };
  }

  /**
   * Remove prerequisite from course
   */
  async removePrerequisite(courseId: string, prerequisiteId: string, removedById?: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId, deletedAt: null },
      include: { prerequisites: { select: { id: true, code: true } } },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const prereq = course.prerequisites.find(p => p.id === prerequisiteId);

    if (!prereq) {
      throw AppError.notFound('Prerequisite relationship not found');
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        prerequisites: { disconnect: { id: prerequisiteId } },
      },
    });

    await this.createAuditLog(removedById, 'REMOVE_PREREQUISITE', 'Course', courseId, {
      courseCode: course.code,
      prerequisiteCode: prereq.code,
    }, null);

    return { message: 'Prerequisite removed successfully' };
  }

  /**
   * Get classes for a course
   */
  async getClasses(courseId: string, semesterId?: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId, deletedAt: null },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const where: Prisma.ClassWhereInput = {
      courseId,
    };

    if (semesterId) {
      where.semesterId = semesterId;
    }

    const classes = await prisma.class.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        semester: true,
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
        room: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      semester: {
        id: cls.semester.id,
        name: cls.semester.name,
      },
      lecturer: {
        id: cls.lecturer.id,
        name: `${cls.lecturer.user.firstName} ${cls.lecturer.user.lastName}`,
      },
      room: cls.room ? {
        id: cls.room.id,
        name: cls.room.name,
        building: cls.room.building,
      } : null,
      capacity: cls.capacity,
      enrollmentCount: cls._count.enrollments,
    }));
  }

  /**
   * Get prerequisite chain for a course
   */
  async getPrerequisiteChain(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId, deletedAt: null },
    });

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const chain = await this.buildPrerequisiteTree(courseId);

    return {
      course: { id: course.id, code: course.code, name: course.name },
      prerequisites: chain,
    };
  }

  // Private methods

  private async checkCircularDependency(courseId: string, newPrereqId: string): Promise<boolean> {
    // Check if the new prerequisite has the course in its prerequisite chain
    const visited = new Set<string>();
    const queue = [newPrereqId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === courseId) {
        return true; // Found circular dependency
      }

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const course = await prisma.course.findUnique({
        where: { id: currentId },
        include: { prerequisites: { select: { id: true } } },
      });

      if (course) {
        for (const prereq of course.prerequisites) {
          if (!visited.has(prereq.id)) {
            queue.push(prereq.id);
          }
        }
      }
    }

    return false;
  }

  private async buildPrerequisiteTree(courseId: string, visited = new Set<string>()): Promise<any[]> {
    if (visited.has(courseId)) {
      return [];
    }
    visited.add(courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        prerequisites: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!course) {
      return [];
    }

    const result = [];
    for (const prereq of course.prerequisites) {
      const children = await this.buildPrerequisiteTree(prereq.id, visited);
      result.push({
        id: prereq.id,
        code: prereq.code,
        name: prereq.name,
        prerequisites: children,
      });
    }

    return result;
  }

  private formatCourse(course: any) {
    return {
      id: course.id,
      name: course.name,
      nameLocal: course.nameLocal,
      code: course.code,
      credits: course.credits,
      description: course.description,
      department: course.department ? {
        id: course.department.id,
        name: course.department.name,
        code: course.department.code,
        faculty: course.department.faculty ? {
          id: course.department.faculty.id,
          name: course.department.faculty.name,
        } : null,
      } : null,
      prerequisites: course.prerequisites?.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })) || [],
      classCount: course._count?.classes || 0,
      programCount: course._count?.curriculum || 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  private formatCourseWithDetails(course: any) {
    return {
      ...this.formatCourse(course),
      prerequisiteFor: course.prerequisiteFor?.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })) || [],
      usedInPrograms: course.curriculum?.map((c: any) => ({
        id: c.program.id,
        code: c.program.code,
        name: c.program.name,
        semester: c.semester,
        isRequired: c.isRequired,
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

export const courseService = new CourseService();
