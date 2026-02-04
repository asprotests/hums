import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ReviewApplicationInput,
  ApplicationQueryInput,
} from '../validators/admission.validator.js';
import bcrypt from 'bcryptjs';

export class AdmissionService {
  /**
   * Generate application number
   */
  private async generateApplicationNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APP/${year}/`;

    const lastApplication = await prisma.admissionApplication.findFirst({
      where: {
        applicationNo: { startsWith: prefix },
      },
      orderBy: { applicationNo: 'desc' },
    });

    let nextNumber = 1;
    if (lastApplication) {
      const lastNumber = parseInt(lastApplication.applicationNo.split('/')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Generate student ID
   */
  private async generateStudentId(admissionYear: number): Promise<string> {
    const prefix = `HU/${admissionYear}/`;

    const lastStudent = await prisma.student.findFirst({
      where: {
        studentId: { startsWith: prefix },
      },
      orderBy: { studentId: 'desc' },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentId.split('/')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Create a new admission application
   */
  async createApplication(data: CreateApplicationInput, createdById?: string) {
    // Check if email already exists in applications
    const existingEmail = await prisma.admissionApplication.findFirst({
      where: {
        email: data.email,
        status: { notIn: ['REJECTED', 'ENROLLED'] },
      },
    });
    if (existingEmail) {
      throw AppError.conflict('An application with this email already exists');
    }

    // Check if email exists as a user
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw AppError.conflict('This email is already registered in the system');
    }

    // Verify program exists
    const program = await prisma.program.findUnique({
      where: { id: data.programId, deletedAt: null },
    });
    if (!program) {
      throw AppError.badRequest('Invalid program ID');
    }

    const applicationNo = await this.generateApplicationNo();

    const application = await prisma.admissionApplication.create({
      data: {
        applicationNo,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        firstNameLocal: data.firstNameLocal,
        lastNameLocal: data.lastNameLocal,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        district: data.district,
        nationality: data.nationality,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        previousEducationLevel: data.previousEducationLevel,
        previousSchoolName: data.previousSchoolName,
        graduationYear: data.graduationYear,
        programId: data.programId,
      },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
      },
    });

    await this.createAuditLog(createdById, 'CREATE', 'AdmissionApplication', application.id, null, {
      applicationNo: application.applicationNo,
      name: `${application.firstName} ${application.lastName}`,
      program: program.name,
    });

    return this.formatApplication(application);
  }

  /**
   * Get applications with pagination and filters
   */
  async getApplications(filters: ApplicationQueryInput) {
    const { search, status, programId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AdmissionApplicationWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { applicationNo: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (programId) {
      where.programId = programId;
    }

    const [applications, total] = await Promise.all([
      prisma.admissionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          program: {
            include: {
              department: {
                include: { faculty: true },
              },
            },
          },
          documents: true,
        },
      }),
      prisma.admissionApplication.count({ where }),
    ]);

    return {
      data: applications.map(this.formatApplication),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get application by ID
   */
  async getApplicationById(id: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
        student: true,
      },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    return this.formatApplication(application);
  }

  /**
   * Update application
   */
  async updateApplication(id: string, data: UpdateApplicationInput, updatedById?: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
      throw AppError.badRequest('Cannot update application in current status');
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== application.email) {
      const emailExists = await prisma.admissionApplication.findFirst({
        where: {
          email: data.email,
          id: { not: id },
          status: { notIn: ['REJECTED', 'ENROLLED'] },
        },
      });
      if (emailExists) {
        throw AppError.conflict('Email already exists in another application');
      }
    }

    // Verify program if changing
    if (data.programId && data.programId !== application.programId) {
      const program = await prisma.program.findUnique({
        where: { id: data.programId, deletedAt: null },
      });
      if (!program) {
        throw AppError.badRequest('Invalid program ID');
      }
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data,
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'AdmissionApplication', id,
      { name: `${application.firstName} ${application.lastName}` },
      { name: `${updated.firstName} ${updated.lastName}` }
    );

    return this.formatApplication(updated);
  }

  /**
   * Review application (change status)
   */
  async reviewApplication(id: string, data: ReviewApplicationInput, reviewerId: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    };

    if (!validTransitions[application.status]?.includes(data.status)) {
      throw AppError.badRequest(`Cannot change status from ${application.status} to ${data.status}`);
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status: data.status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewRemarks: data.remarks,
      },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
      },
    });

    await this.createAuditLog(reviewerId, 'REVIEW', 'AdmissionApplication', id,
      { status: application.status },
      { status: data.status, remarks: data.remarks }
    );

    return this.formatApplication(updated);
  }

  /**
   * Approve application
   */
  async approveApplication(id: string, reviewerId: string) {
    return this.reviewApplication(id, { status: 'APPROVED' }, reviewerId);
  }

  /**
   * Reject application
   */
  async rejectApplication(id: string, reason: string, reviewerId: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
      throw AppError.badRequest('Cannot reject application in current status');
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
      },
    });

    await this.createAuditLog(reviewerId, 'REJECT', 'AdmissionApplication', id,
      { status: application.status },
      { status: 'REJECTED', reason }
    );

    return this.formatApplication(updated);
  }

  /**
   * Enroll student from approved application
   */
  async enrollStudent(applicationId: string, enrolledById: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id: applicationId },
      include: { program: true },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (application.status !== 'APPROVED') {
      throw AppError.badRequest('Only approved applications can be enrolled');
    }

    if (application.studentId) {
      throw AppError.badRequest('Application has already been enrolled');
    }

    // Generate student ID
    const admissionYear = new Date().getFullYear();
    const studentId = await this.generateStudentId(admissionYear);

    // Generate username from email
    const username = application.email.split('@')[0] + '_' + Date.now().toString().slice(-4);

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Calculate expected graduation
    const expectedGraduation = new Date();
    expectedGraduation.setFullYear(expectedGraduation.getFullYear() + application.program.durationYears);

    // Create user and student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email: application.email,
          username,
          passwordHash,
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          isActive: true,
          emailVerified: false,
        },
      });

      // Assign STUDENT role
      const studentRole = await tx.role.findUnique({
        where: { name: 'STUDENT' },
      });

      if (studentRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: studentRole.id,
          },
        });
      }

      // Create student record
      const student = await tx.student.create({
        data: {
          studentId,
          userId: user.id,
          programId: application.programId,
          admissionDate: new Date(),
          expectedGraduation,
          status: 'ACTIVE',
          currentSemester: 1,
          dateOfBirth: application.dateOfBirth,
          gender: application.gender,
          nationality: application.nationality,
          address: application.address,
          emergencyContact: application.emergencyContactName,
          emergencyContactPhone: application.emergencyContactPhone,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          program: {
            include: {
              department: {
                include: { faculty: true },
              },
            },
          },
        },
      });

      // Update application status
      await tx.admissionApplication.update({
        where: { id: applicationId },
        data: {
          status: 'ENROLLED',
          enrolledAt: new Date(),
          studentId: student.id,
        },
      });

      // Transfer documents from application to student
      await tx.document.updateMany({
        where: { applicationId },
        data: { studentId: student.id },
      });

      return { student, tempPassword };
    });

    await this.createAuditLog(enrolledById, 'ENROLL', 'AdmissionApplication', applicationId, null, {
      studentId: result.student.studentId,
      name: `${result.student.user.firstName} ${result.student.user.lastName}`,
    });

    return {
      student: this.formatStudent(result.student),
      credentials: {
        email: application.email,
        tempPassword: result.tempPassword,
        message: 'Student enrolled successfully. Please share the temporary password securely.',
      },
    };
  }

  /**
   * Get admission statistics
   */
  async getStatistics() {
    const currentYear = new Date().getFullYear();

    const [statusCounts, programCounts, monthlyTrend] = await Promise.all([
      // Count by status
      prisma.admissionApplication.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Count by program (top 5)
      prisma.admissionApplication.groupBy({
        by: ['programId'],
        _count: true,
        orderBy: { _count: { programId: 'desc' } },
        take: 5,
      }),
      // Monthly trend for current year
      prisma.$queryRaw<{ month: number; count: bigint }[]>`
        SELECT EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count
        FROM admission_applications
        WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
        GROUP BY EXTRACT(MONTH FROM created_at)
        ORDER BY month
      `,
    ]);

    // Get program names for the top programs
    const programIds = programCounts.map((p) => p.programId);
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, name: true, code: true },
    });

    const programMap = new Map(programs.map((p) => [p.id, p]));

    return {
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byProgram: programCounts.map((p) => ({
        program: programMap.get(p.programId),
        count: p._count,
      })),
      monthlyTrend: monthlyTrend.map((m) => ({
        month: Number(m.month),
        count: Number(m.count),
      })),
      total: statusCounts.reduce((sum, item) => sum + item._count, 0),
    };
  }

  // Private helper methods

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!';
  }

  private formatApplication(application: any) {
    return {
      id: application.id,
      applicationNo: application.applicationNo,
      status: application.status,
      personalInfo: {
        firstName: application.firstName,
        middleName: application.middleName,
        lastName: application.lastName,
        firstNameLocal: application.firstNameLocal,
        lastNameLocal: application.lastNameLocal,
        fullName: [application.firstName, application.middleName, application.lastName].filter(Boolean).join(' '),
        dateOfBirth: application.dateOfBirth,
        gender: application.gender,
        phone: application.phone,
        email: application.email,
        address: application.address,
        city: application.city,
        district: application.district,
        nationality: application.nationality,
      },
      emergencyContact: {
        name: application.emergencyContactName,
        phone: application.emergencyContactPhone,
        relation: application.emergencyContactRelation,
      },
      academicInfo: {
        previousEducationLevel: application.previousEducationLevel,
        previousSchoolName: application.previousSchoolName,
        graduationYear: application.graduationYear,
      },
      program: application.program ? {
        id: application.program.id,
        name: application.program.name,
        code: application.program.code,
        type: application.program.type,
        department: application.program.department ? {
          id: application.program.department.id,
          name: application.program.department.name,
          faculty: application.program.department.faculty ? {
            id: application.program.department.faculty.id,
            name: application.program.department.faculty.name,
          } : null,
        } : null,
      } : null,
      documents: application.documents?.map((doc: any) => ({
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        originalName: doc.originalName,
        size: doc.size,
        url: doc.url,
        createdAt: doc.createdAt,
      })) || [],
      review: {
        reviewedAt: application.reviewedAt,
        remarks: application.reviewRemarks,
        rejectionReason: application.rejectionReason,
      },
      enrollment: {
        enrolledAt: application.enrolledAt,
        studentId: application.student?.studentId,
      },
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private formatStudent(student: any) {
    return {
      id: student.id,
      studentId: student.studentId,
      user: student.user ? {
        id: student.user.id,
        email: student.user.email,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
      } : null,
      program: student.program ? {
        id: student.program.id,
        name: student.program.name,
        code: student.program.code,
        type: student.program.type,
        department: student.program.department ? {
          id: student.program.department.id,
          name: student.program.department.name,
          faculty: student.program.department.faculty ? {
            id: student.program.department.faculty.id,
            name: student.program.department.faculty.name,
          } : null,
        } : null,
      } : null,
      admissionDate: student.admissionDate,
      expectedGraduation: student.expectedGraduation,
      status: student.status,
      currentSemester: student.currentSemester,
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

export const admissionService = new AdmissionService();
