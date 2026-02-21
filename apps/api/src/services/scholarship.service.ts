import { prisma, Prisma } from '@hums/database';
import type { ScholarshipType } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

interface ScholarshipCriteria {
  minGPA?: number;
  maxIncome?: number;
  programs?: string[];
  yearOfStudy?: number[];
}

interface CreateScholarshipInput {
  name: string;
  description?: string;
  type: ScholarshipType;
  amount: number;
  amountType: 'FIXED' | 'PERCENTAGE';
  criteria?: ScholarshipCriteria;
  maxRecipients?: number;
  academicYearId?: string;
  applicationDeadline?: Date;
  isActive?: boolean;
}

interface UpdateScholarshipInput {
  name?: string;
  description?: string;
  type?: ScholarshipType;
  amount?: number;
  amountType?: 'FIXED' | 'PERCENTAGE';
  criteria?: ScholarshipCriteria;
  maxRecipients?: number;
  academicYearId?: string;
  applicationDeadline?: Date;
  isActive?: boolean;
}

interface ScholarshipQueryInput {
  type?: ScholarshipType;
  academicYearId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export class ScholarshipService {
  /**
   * Create a scholarship
   */
  async createScholarship(data: CreateScholarshipInput, userId: string) {
    // Validate academic year if provided
    if (data.academicYearId) {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: data.academicYearId },
      });
      if (!academicYear) {
        throw AppError.notFound('Academic year not found');
      }
    }

    const scholarship = await prisma.scholarship.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        amount: data.amount,
        amountType: data.amountType,
        criteria: data.criteria as Prisma.InputJsonValue,
        maxRecipients: data.maxRecipients,
        academicYearId: data.academicYearId,
        applicationDeadline: data.applicationDeadline,
        isActive: data.isActive ?? true,
      },
      include: {
        academicYear: true,
        _count: { select: { awards: true } },
      },
    });

    await auditService.log({
      userId,
      action: 'CREATE',
      resource: 'Scholarship',
      resourceId: scholarship.id,
      newValues: data,
    });

    return scholarship;
  }

  /**
   * Get scholarships with filtering and pagination
   */
  async getScholarships(query: ScholarshipQueryInput = {}) {
    const { type, academicYearId, isActive, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ScholarshipWhereInput = {};

    if (type) where.type = type;
    if (academicYearId) where.academicYearId = academicYearId;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [scholarships, total] = await Promise.all([
      prisma.scholarship.findMany({
        where,
        include: {
          academicYear: true,
          _count: { select: { awards: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scholarship.count({ where }),
    ]);

    return {
      data: scholarships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get scholarship by ID
   */
  async getScholarshipById(id: string) {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
      include: {
        academicYear: true,
        awards: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, middleName: true, lastName: true, email: true },
                },
                program: { select: { id: true, code: true, name: true } },
              },
            },
            awardedBy: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { awardedAt: 'desc' },
        },
        _count: { select: { awards: true } },
      },
    });

    if (!scholarship) {
      throw AppError.notFound('Scholarship not found');
    }

    return scholarship;
  }

  /**
   * Update scholarship
   */
  async updateScholarship(id: string, data: UpdateScholarshipInput, userId: string) {
    const existing = await prisma.scholarship.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Scholarship not found');
    }

    if (data.academicYearId) {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: data.academicYearId },
      });
      if (!academicYear) {
        throw AppError.notFound('Academic year not found');
      }
    }

    const scholarship = await prisma.scholarship.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        amount: data.amount,
        amountType: data.amountType,
        criteria: data.criteria as Prisma.InputJsonValue,
        maxRecipients: data.maxRecipients,
        academicYearId: data.academicYearId,
        applicationDeadline: data.applicationDeadline,
        isActive: data.isActive,
      },
      include: {
        academicYear: true,
        _count: { select: { awards: true } },
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'Scholarship',
      resourceId: id,
      oldValues: existing,
      newValues: data,
    });

    return scholarship;
  }

  /**
   * Delete scholarship (only if no awards)
   */
  async deleteScholarship(id: string, userId: string) {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
      include: { _count: { select: { awards: true } } },
    });

    if (!scholarship) {
      throw AppError.notFound('Scholarship not found');
    }

    if (scholarship._count.awards > 0) {
      throw AppError.badRequest('Cannot delete scholarship with existing awards');
    }

    await prisma.scholarship.delete({ where: { id } });

    await auditService.log({
      userId,
      action: 'DELETE',
      resource: 'Scholarship',
      resourceId: id,
      oldValues: scholarship,
    });

    return { success: true };
  }

  /**
   * Check student eligibility for scholarship
   */
  async checkEligibility(studentId: string, scholarshipId: string): Promise<EligibilityResult> {
    const [student, scholarship] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId, deletedAt: null },
        include: {
          program: true,
          enrollments: {
            where: { isFinalized: true },
            select: { gradePoints: true },
          },
        },
      }),
      prisma.scholarship.findUnique({
        where: { id: scholarshipId },
        include: { _count: { select: { awards: { where: { status: { not: 'REVOKED' } } } } } },
      }),
    ]);

    if (!student) {
      return { eligible: false, reasons: ['Student not found'] };
    }

    if (!scholarship) {
      return { eligible: false, reasons: ['Scholarship not found'] };
    }

    const reasons: string[] = [];

    // Check if scholarship is active
    if (!scholarship.isActive) {
      reasons.push('Scholarship is not active');
    }

    // Check application deadline
    if (scholarship.applicationDeadline && new Date() > scholarship.applicationDeadline) {
      reasons.push('Application deadline has passed');
    }

    // Check max recipients
    if (scholarship.maxRecipients && scholarship._count.awards >= scholarship.maxRecipients) {
      reasons.push('Maximum number of recipients reached');
    }

    // Check criteria
    const criteria = scholarship.criteria as ScholarshipCriteria | null;
    if (criteria) {
      // Check GPA
      if (criteria.minGPA !== undefined && student.enrollments.length > 0) {
        const gpaSum = student.enrollments.reduce((sum, e) => sum + (Number(e.gradePoints) || 0), 0);
        const avgGPA = gpaSum / student.enrollments.length;
        if (avgGPA < criteria.minGPA) {
          reasons.push(`GPA (${avgGPA.toFixed(2)}) is below minimum requirement (${criteria.minGPA})`);
        }
      }

      // Check program
      if (criteria.programs && criteria.programs.length > 0) {
        if (!criteria.programs.includes(student.programId)) {
          reasons.push('Student program is not eligible');
        }
      }

      // Check year of study
      if (criteria.yearOfStudy && criteria.yearOfStudy.length > 0) {
        const currentYear = Math.ceil(student.currentSemester / 2);
        if (!criteria.yearOfStudy.includes(currentYear)) {
          reasons.push(`Year of study (${currentYear}) is not eligible`);
        }
      }
    }

    // Check if already awarded
    const existingAward = await prisma.studentScholarship.findFirst({
      where: {
        studentId,
        scholarshipId,
        status: { not: 'REVOKED' },
      },
    });

    if (existingAward) {
      reasons.push('Student already has this scholarship');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get eligible students for a scholarship
   */
  async getEligibleStudents(scholarshipId: string) {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    });

    if (!scholarship) {
      throw AppError.notFound('Scholarship not found');
    }

    const students = await prisma.student.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: {
        user: {
          select: { firstName: true, middleName: true, lastName: true, email: true },
        },
        program: { select: { id: true, code: true, name: true } },
        enrollments: {
          where: { isFinalized: true },
          select: { gradePoints: true },
        },
      },
    });

    const eligibleStudents = [];
    for (const student of students) {
      const result = await this.checkEligibility(student.id, scholarshipId);
      if (result.eligible) {
        // Calculate GPA
        const gpaSum = student.enrollments.reduce((sum, e) => sum + (Number(e.gradePoints) || 0), 0);
        const avgGPA = student.enrollments.length > 0 ? gpaSum / student.enrollments.length : 0;
        eligibleStudents.push({
          ...student,
          gpa: avgGPA,
        });
      }
    }

    return eligibleStudents;
  }

  /**
   * Award scholarship to student
   */
  async awardScholarship(
    studentId: string,
    scholarshipId: string,
    amount: number,
    awardedById: string,
    notes?: string
  ) {
    // Check eligibility
    const eligibility = await this.checkEligibility(studentId, scholarshipId);
    if (!eligibility.eligible) {
      throw AppError.badRequest(`Student not eligible: ${eligibility.reasons.join(', ')}`);
    }

    const scholarship = await prisma.scholarship.findUnique({ where: { id: scholarshipId } });
    if (!scholarship) {
      throw AppError.notFound('Scholarship not found');
    }

    // Calculate amount if percentage
    let awardAmount = amount;
    if (scholarship.amountType === 'PERCENTAGE') {
      awardAmount = amount; // The amount passed should already be calculated
    }

    const award = await prisma.studentScholarship.create({
      data: {
        studentId,
        scholarshipId,
        amount: awardAmount,
        status: 'PENDING',
        awardedById,
        notes,
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, middleName: true, lastName: true, email: true },
            },
          },
        },
        scholarship: true,
        awardedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    await auditService.log({
      userId: awardedById,
      action: 'CREATE',
      resource: 'StudentScholarship',
      resourceId: award.id,
      newValues: { studentId, scholarshipId, amount: awardAmount },
    });

    return award;
  }

  /**
   * Get student scholarships
   */
  async getStudentScholarships(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return prisma.studentScholarship.findMany({
      where: { studentId },
      include: {
        scholarship: {
          include: { academicYear: true },
        },
        awardedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { awardedAt: 'desc' },
    });
  }

  /**
   * Approve scholarship award
   */
  async approveAward(awardId: string, userId: string) {
    const award = await prisma.studentScholarship.findUnique({
      where: { id: awardId },
    });

    if (!award) {
      throw AppError.notFound('Award not found');
    }

    if (award.status !== 'PENDING') {
      throw AppError.badRequest('Award is not pending');
    }

    const updated = await prisma.studentScholarship.update({
      where: { id: awardId },
      data: { status: 'APPROVED' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        scholarship: true,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'StudentScholarship',
      resourceId: awardId,
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED' },
    });

    return updated;
  }

  /**
   * Apply scholarship award to invoice
   */
  async applyToInvoice(awardId: string, invoiceId: string, userId: string) {
    const award = await prisma.studentScholarship.findUnique({
      where: { id: awardId },
      include: { student: true },
    });

    if (!award) {
      throw AppError.notFound('Award not found');
    }

    if (award.status !== 'APPROVED') {
      throw AppError.badRequest('Award must be approved before applying');
    }

    if (award.appliedToInvoice) {
      throw AppError.badRequest('Award already applied to an invoice');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    if (invoice.studentId !== award.studentId) {
      throw AppError.badRequest('Invoice does not belong to this student');
    }

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot apply to paid or cancelled invoice');
    }

    // Update award status and invoice reference
    const updated = await prisma.studentScholarship.update({
      where: { id: awardId },
      data: {
        status: 'APPLIED',
        appliedToInvoice: invoiceId,
      },
      include: {
        scholarship: true,
      },
    });

    // Update invoice amount (subtract scholarship)
    const newAmount = Number(invoice.amount) - Number(award.amount);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount > 0 ? newAmount : 0,
        status: newAmount <= 0 ? 'PAID' : invoice.status,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'StudentScholarship',
      resourceId: awardId,
      oldValues: { status: 'APPROVED', appliedToInvoice: null },
      newValues: { status: 'APPLIED', appliedToInvoice: invoiceId },
    });

    return updated;
  }

  /**
   * Revoke scholarship award
   */
  async revokeAward(awardId: string, reason: string, userId: string) {
    const award = await prisma.studentScholarship.findUnique({
      where: { id: awardId },
    });

    if (!award) {
      throw AppError.notFound('Award not found');
    }

    if (award.status === 'REVOKED') {
      throw AppError.badRequest('Award is already revoked');
    }

    if (award.status === 'APPLIED') {
      throw AppError.badRequest('Cannot revoke an applied award. Reverse the invoice first.');
    }

    const updated = await prisma.studentScholarship.update({
      where: { id: awardId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        scholarship: true,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'StudentScholarship',
      resourceId: awardId,
      oldValues: { status: award.status },
      newValues: { status: 'REVOKED', revokedReason: reason },
    });

    return updated;
  }
}

export const scholarshipService = new ScholarshipService();
