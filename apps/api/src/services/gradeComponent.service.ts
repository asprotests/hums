import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { GradeComponentType } from '@hums/database';

export interface CreateComponentInput {
  name: string;
  type: GradeComponentType;
  weight: number;
  maxScore: number;
  dueDate?: Date;
}

export interface UpdateComponentInput {
  name?: string;
  type?: GradeComponentType;
  weight?: number;
  maxScore?: number;
  dueDate?: Date;
  isPublished?: boolean;
}

export interface CopyComponentsInput {
  sourceClassId: string;
  targetClassId: string;
}

export class GradeComponentService {
  /**
   * Get all components for a class
   */
  async getClassComponents(classId: string) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    return prisma.gradeComponent.findMany({
      where: { classId },
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a single component by ID
   */
  async getComponent(id: string) {
    const component = await prisma.gradeComponent.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            semester: true,
          },
        },
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!component) {
      throw AppError.notFound('Grade component not found');
    }

    return component;
  }

  /**
   * Create a new grade component
   */
  async createComponent(classId: string, input: CreateComponentInput, userId?: string) {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Check total weight doesn't exceed 100%
    const existingComponents = await prisma.gradeComponent.findMany({
      where: { classId },
    });

    const totalWeight = existingComponents.reduce(
      (sum, c) => sum + Number(c.weight),
      0
    );

    if (totalWeight + input.weight > 100) {
      throw AppError.badRequest(
        `Total weight would exceed 100%. Current total: ${totalWeight}%, requested: ${input.weight}%`
      );
    }

    const component = await prisma.gradeComponent.create({
      data: {
        classId,
        name: input.name,
        type: input.type,
        weight: input.weight,
        maxScore: input.maxScore,
        dueDate: input.dueDate,
      },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.CREATE,
        resource: 'GradeComponent',
        resourceId: component.id,
        userId,
        newValues: { ...input, classId },
      });
    }

    return component;
  }

  /**
   * Update a grade component
   */
  async updateComponent(id: string, input: UpdateComponentInput, userId?: string) {
    const existing = await prisma.gradeComponent.findUnique({
      where: { id },
      include: { entries: true },
    });

    if (!existing) {
      throw AppError.notFound('Grade component not found');
    }

    // If changing weight, verify it doesn't exceed 100%
    if (input.weight !== undefined && input.weight !== Number(existing.weight)) {
      const otherComponents = await prisma.gradeComponent.findMany({
        where: { classId: existing.classId, id: { not: id } },
      });

      const totalWeight = otherComponents.reduce(
        (sum, c) => sum + Number(c.weight),
        0
      );

      if (totalWeight + input.weight > 100) {
        throw AppError.badRequest(
          `Total weight would exceed 100%. Other components: ${totalWeight}%, requested: ${input.weight}%`
        );
      }
    }

    // If entries exist and trying to change maxScore, warn
    if (
      input.maxScore !== undefined &&
      input.maxScore !== Number(existing.maxScore) &&
      existing.entries.length > 0
    ) {
      throw AppError.badRequest(
        'Cannot change max score when grades have been entered. Delete entries first.'
      );
    }

    const component = await prisma.gradeComponent.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        weight: input.weight,
        maxScore: input.maxScore,
        dueDate: input.dueDate,
        isPublished: input.isPublished,
      },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'GradeComponent',
        resourceId: id,
        userId,
        oldValues: {
          name: existing.name,
          weight: Number(existing.weight),
          maxScore: Number(existing.maxScore),
        },
        newValues: input,
      });
    }

    return component;
  }

  /**
   * Delete a grade component
   */
  async deleteComponent(id: string, userId?: string) {
    const existing = await prisma.gradeComponent.findUnique({
      where: { id },
      include: { entries: true },
    });

    if (!existing) {
      throw AppError.notFound('Grade component not found');
    }

    if (existing.entries.length > 0) {
      throw AppError.badRequest(
        'Cannot delete component with existing grade entries. Delete entries first.'
      );
    }

    await prisma.gradeComponent.delete({
      where: { id },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.DELETE,
        resource: 'GradeComponent',
        resourceId: id,
        userId,
        oldValues: { name: existing.name, classId: existing.classId },
      });
    }
  }

  /**
   * Validate that component weights sum to 100%
   */
  async validateWeights(classId: string) {
    const components = await prisma.gradeComponent.findMany({
      where: { classId },
    });

    const total = components.reduce((sum, c) => sum + Number(c.weight), 0);

    return {
      valid: Math.abs(total - 100) < 0.01, // Allow for floating point errors
      total,
      components: components.map((c) => ({
        id: c.id,
        name: c.name,
        weight: Number(c.weight),
      })),
    };
  }

  /**
   * Copy components from one class to another
   */
  async copyComponentsFromClass(input: CopyComponentsInput, userId?: string) {
    const { sourceClassId, targetClassId } = input;

    // Verify source class has components
    const sourceComponents = await prisma.gradeComponent.findMany({
      where: { classId: sourceClassId },
    });

    if (sourceComponents.length === 0) {
      throw AppError.badRequest('Source class has no grade components');
    }

    // Verify target class exists and has no components
    const targetClass = await prisma.class.findUnique({
      where: { id: targetClassId },
      include: { gradeComponents: true },
    });

    if (!targetClass) {
      throw AppError.notFound('Target class not found');
    }

    if (targetClass.gradeComponents.length > 0) {
      throw AppError.badRequest('Target class already has grade components');
    }

    // Copy components
    const createdComponents = await prisma.gradeComponent.createMany({
      data: sourceComponents.map((c) => ({
        classId: targetClassId,
        name: c.name,
        type: c.type,
        weight: c.weight,
        maxScore: c.maxScore,
        dueDate: c.dueDate,
        isPublished: false,
      })),
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.CREATE,
        resource: 'GradeComponent',
        resourceId: targetClassId,
        userId,
        newValues: {
          sourceClassId,
          targetClassId,
          componentsCount: createdComponents.count,
        },
      });
    }

    return prisma.gradeComponent.findMany({
      where: { classId: targetClassId },
    });
  }

  /**
   * Publish a component (make grades visible to students)
   */
  async publishComponent(id: string, userId?: string) {
    const component = await prisma.gradeComponent.update({
      where: { id },
      data: { isPublished: true },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'GradeComponent',
        resourceId: id,
        userId,
        newValues: { isPublished: true },
      });
    }

    return component;
  }

  /**
   * Unpublish a component
   */
  async unpublishComponent(id: string, userId?: string) {
    const component = await prisma.gradeComponent.update({
      where: { id },
      data: { isPublished: false },
    });

    if (userId) {
      await auditService.log({
        action: AuditAction.UPDATE,
        resource: 'GradeComponent',
        resourceId: id,
        userId,
        newValues: { isPublished: false },
      });
    }

    return component;
  }
}

export const gradeComponentService = new GradeComponentService();
