import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { Prisma } from '@hums/database';

export interface GradeDefinitionInput {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints: number;
  description?: string;
}

export interface CreateGradeScaleInput {
  name: string;
  isDefault?: boolean;
  grades: GradeDefinitionInput[];
}

export interface UpdateGradeScaleInput {
  name?: string;
  grades?: GradeDefinitionInput[];
}

// Default Somali University Grade Scale
const defaultGradeScale: GradeDefinitionInput[] = [
  { letter: 'A+', minPercentage: 95, maxPercentage: 100, gradePoints: 4.0, description: 'Exceptional' },
  { letter: 'A', minPercentage: 90, maxPercentage: 94, gradePoints: 4.0, description: 'Excellent' },
  { letter: 'A-', minPercentage: 87, maxPercentage: 89, gradePoints: 3.7, description: 'Very Good' },
  { letter: 'B+', minPercentage: 83, maxPercentage: 86, gradePoints: 3.3, description: 'Good' },
  { letter: 'B', minPercentage: 80, maxPercentage: 82, gradePoints: 3.0, description: 'Above Average' },
  { letter: 'B-', minPercentage: 77, maxPercentage: 79, gradePoints: 2.7, description: 'Average' },
  { letter: 'C+', minPercentage: 73, maxPercentage: 76, gradePoints: 2.3, description: 'Below Average' },
  { letter: 'C', minPercentage: 70, maxPercentage: 72, gradePoints: 2.0, description: 'Satisfactory' },
  { letter: 'C-', minPercentage: 67, maxPercentage: 69, gradePoints: 1.7, description: 'Pass' },
  { letter: 'D+', minPercentage: 63, maxPercentage: 66, gradePoints: 1.3, description: 'Marginal Pass' },
  { letter: 'D', minPercentage: 60, maxPercentage: 62, gradePoints: 1.0, description: 'Minimum Pass' },
  { letter: 'F', minPercentage: 0, maxPercentage: 59, gradePoints: 0.0, description: 'Fail' },
];

export class GradeConfigService {
  /**
   * Get all grade scales
   */
  async getGradeScales() {
    return prisma.gradeScale.findMany({
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get grade scale by ID
   */
  async getGradeScale(id: string) {
    const scale = await prisma.gradeScale.findUnique({
      where: { id },
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
    });

    if (!scale) {
      throw AppError.notFound('Grade scale not found');
    }

    return scale;
  }

  /**
   * Get the default grade scale
   */
  async getDefaultScale() {
    let scale = await prisma.gradeScale.findFirst({
      where: { isDefault: true },
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
    });

    // If no default scale exists, create the standard scale
    if (!scale) {
      scale = await this.createGradeScale({
        name: 'Standard Scale',
        isDefault: true,
        grades: defaultGradeScale,
      });
    }

    return scale;
  }

  /**
   * Create a new grade scale
   */
  async createGradeScale(input: CreateGradeScaleInput, userId?: string) {
    const { name, isDefault, grades } = input;

    // If setting as default, unset current default
    if (isDefault) {
      await prisma.gradeScale.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const scale = await prisma.gradeScale.create({
      data: {
        name,
        isDefault: isDefault || false,
        grades: {
          create: grades.map((g) => ({
            letter: g.letter,
            minPercentage: g.minPercentage,
            maxPercentage: g.maxPercentage,
            gradePoints: g.gradePoints,
            description: g.description,
          })),
        },
      },
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.CREATE,
        resource: 'GradeScale',
        resourceId: scale.id,
        userId,
        newValues: { name, isDefault, gradesCount: grades.length },
      });
    }

    return scale;
  }

  /**
   * Update a grade scale
   */
  async updateGradeScale(id: string, input: UpdateGradeScaleInput, userId?: string) {
    const existing = await prisma.gradeScale.findUnique({
      where: { id },
      include: { grades: true },
    });

    if (!existing) {
      throw AppError.notFound('Grade scale not found');
    }

    const updateData: Prisma.GradeScaleUpdateInput = {};

    if (input.name) {
      updateData.name = input.name;
    }

    // If grades are provided, replace all existing grades
    if (input.grades) {
      // Delete existing grades
      await prisma.gradeDefinition.deleteMany({
        where: { scaleId: id },
      });

      // Create new grades
      await prisma.gradeDefinition.createMany({
        data: input.grades.map((g) => ({
          scaleId: id,
          letter: g.letter,
          minPercentage: g.minPercentage,
          maxPercentage: g.maxPercentage,
          gradePoints: g.gradePoints,
          description: g.description,
        })),
      });
    }

    const scale = await prisma.gradeScale.update({
      where: { id },
      data: updateData,
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'GradeScale',
        resourceId: id,
        userId,
        oldValues: { name: existing.name },
        newValues: input,
      });
    }

    return scale;
  }

  /**
   * Delete a grade scale
   */
  async deleteGradeScale(id: string, userId?: string) {
    const existing = await prisma.gradeScale.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Grade scale not found');
    }

    if (existing.isDefault) {
      throw AppError.badRequest('Cannot delete the default grade scale');
    }

    await prisma.gradeScale.delete({
      where: { id },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.DELETE,
        resource: 'GradeScale',
        resourceId: id,
        userId,
        oldValues: { name: existing.name },
      });
    }
  }

  /**
   * Set a grade scale as default
   */
  async setDefaultScale(id: string, userId?: string) {
    const existing = await prisma.gradeScale.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Grade scale not found');
    }

    // Unset current default
    await prisma.gradeScale.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    const scale = await prisma.gradeScale.update({
      where: { id },
      data: { isDefault: true },
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'GradeScale',
        resourceId: id,
        userId,
        newValues: { isDefault: true },
      });
    }

    return scale;
  }

  /**
   * Calculate letter grade from percentage
   */
  async calculateLetterGrade(percentage: number, scaleId?: string) {
    let scale;

    if (scaleId) {
      scale = await this.getGradeScale(scaleId);
    } else {
      scale = await this.getDefaultScale();
    }

    const gradeDef = scale.grades.find(
      (g) =>
        percentage >= Number(g.minPercentage) &&
        percentage <= Number(g.maxPercentage)
    );

    if (!gradeDef) {
      return { letter: 'F', gradePoints: 0, description: 'Fail' };
    }

    return {
      letter: gradeDef.letter,
      gradePoints: Number(gradeDef.gradePoints),
      description: gradeDef.description,
    };
  }
}

export const gradeConfigService = new GradeConfigService();
