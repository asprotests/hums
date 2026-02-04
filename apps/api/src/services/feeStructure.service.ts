import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
  FeeStructureQueryInput,
} from '../validators/finance.validator.js';

export class FeeStructureService {
  /**
   * Create a new fee structure
   */
  async createFeeStructure(data: CreateFeeStructureInput) {
    // Verify program exists
    const program = await prisma.program.findUnique({
      where: { id: data.programId },
    });

    if (!program) {
      throw AppError.notFound('Program not found');
    }

    // Check if fee structure already exists for this program and academic year
    const existing = await prisma.feeStructure.findUnique({
      where: {
        programId_academicYear: {
          programId: data.programId,
          academicYear: data.academicYear,
        },
      },
    });

    if (existing) {
      throw AppError.conflict('Fee structure already exists for this program and academic year');
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        programId: data.programId,
        academicYear: data.academicYear,
        tuitionFee: data.tuitionFee,
        registrationFee: data.registrationFee,
        libraryFee: data.libraryFee,
        labFee: data.labFee || 0,
        otherFees: data.otherFees,
      },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.formatFeeStructure(feeStructure);
  }

  /**
   * Get fee structures with pagination and filters
   */
  async getFeeStructures(filters: FeeStructureQueryInput) {
    const { programId, academicYear, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.FeeStructureWhereInput = {};

    if (programId) {
      where.programId = programId;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    const [feeStructures, total] = await Promise.all([
      prisma.feeStructure.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
        include: {
          program: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.feeStructure.count({ where }),
    ]);

    return {
      data: feeStructures.map(this.formatFeeStructure),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get fee structure by ID
   */
  async getFeeStructureById(id: string) {
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!feeStructure) {
      throw AppError.notFound('Fee structure not found');
    }

    return this.formatFeeStructure(feeStructure);
  }

  /**
   * Get fee structures by program ID
   */
  async getFeeStructuresByProgram(programId: string) {
    const feeStructures = await prisma.feeStructure.findMany({
      where: { programId },
      orderBy: { academicYear: 'desc' },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return feeStructures.map(this.formatFeeStructure);
  }

  /**
   * Update fee structure
   */
  async updateFeeStructure(id: string, data: UpdateFeeStructureInput) {
    const existing = await prisma.feeStructure.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Fee structure not found');
    }

    const updateData: Prisma.FeeStructureUpdateInput = {};

    if (data.tuitionFee !== undefined) updateData.tuitionFee = data.tuitionFee;
    if (data.registrationFee !== undefined) updateData.registrationFee = data.registrationFee;
    if (data.libraryFee !== undefined) updateData.libraryFee = data.libraryFee;
    if (data.labFee !== undefined) updateData.labFee = data.labFee;
    if (data.otherFees !== undefined) updateData.otherFees = data.otherFees;

    const feeStructure = await prisma.feeStructure.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.formatFeeStructure(feeStructure);
  }

  /**
   * Delete fee structure
   */
  async deleteFeeStructure(id: string) {
    const existing = await prisma.feeStructure.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Fee structure not found');
    }

    // Check if any invoices reference this fee structure indirectly
    // (through students enrolled in the program)
    // For now, we allow deletion but in production you might want stricter checks

    await prisma.feeStructure.delete({
      where: { id },
    });

    return { message: 'Fee structure deleted successfully' };
  }

  /**
   * Calculate total fee for a fee structure
   */
  async calculateTotalFee(feeStructureId: string): Promise<number> {
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId },
    });

    if (!feeStructure) {
      throw AppError.notFound('Fee structure not found');
    }

    let total =
      Number(feeStructure.tuitionFee) +
      Number(feeStructure.registrationFee) +
      Number(feeStructure.libraryFee) +
      Number(feeStructure.labFee);

    // Add other fees if present
    if (feeStructure.otherFees) {
      const otherFees = feeStructure.otherFees as { name: string; amount: number }[];
      total += otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    }

    return total;
  }

  /**
   * Get fee structure for student (based on their program and current academic year)
   */
  async getFeeStructureForStudent(studentId: string, academicYear?: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { programId: true },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Get current academic year if not specified
    let targetYear = academicYear;
    if (!targetYear) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      targetYear = currentYear?.name;
    }

    if (!targetYear) {
      throw AppError.notFound('No current academic year found');
    }

    const feeStructure = await prisma.feeStructure.findUnique({
      where: {
        programId_academicYear: {
          programId: student.programId,
          academicYear: targetYear,
        },
      },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!feeStructure) {
      throw AppError.notFound('Fee structure not found for this program and academic year');
    }

    return this.formatFeeStructure(feeStructure);
  }

  /**
   * Format fee structure for response
   */
  private formatFeeStructure(feeStructure: any) {
    const totalFee =
      Number(feeStructure.tuitionFee) +
      Number(feeStructure.registrationFee) +
      Number(feeStructure.libraryFee) +
      Number(feeStructure.labFee) +
      (feeStructure.otherFees
        ? (feeStructure.otherFees as { name: string; amount: number }[]).reduce(
            (sum, fee) => sum + fee.amount,
            0
          )
        : 0);

    return {
      id: feeStructure.id,
      programId: feeStructure.programId,
      program: feeStructure.program,
      academicYear: feeStructure.academicYear,
      tuitionFee: Number(feeStructure.tuitionFee),
      registrationFee: Number(feeStructure.registrationFee),
      libraryFee: Number(feeStructure.libraryFee),
      labFee: Number(feeStructure.labFee),
      otherFees: feeStructure.otherFees,
      totalFee,
      createdAt: feeStructure.createdAt,
      updatedAt: feeStructure.updatedAt,
    };
  }
}

export const feeStructureService = new FeeStructureService();
