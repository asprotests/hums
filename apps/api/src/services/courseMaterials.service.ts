import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { MaterialType, Prisma } from '@hums/database';

export interface CreateMaterialInput {
  classId: string;
  title: string;
  description?: string;
  type: MaterialType;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  mimeType?: string;
  week?: number;
  isPublished?: boolean;
}

export interface UpdateMaterialInput {
  title?: string;
  description?: string;
  type?: MaterialType;
  fileUrl?: string;
  externalUrl?: string;
  week?: number;
}

export interface MaterialWithDetails {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  type: MaterialType;
  fileUrl: string | null;
  externalUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  week: number | null;
  orderIndex: number;
  isPublished: boolean;
  publishedAt: Date | null;
  uploadedById: string;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CourseMaterialsService {
  /**
   * Upload/create a new course material
   */
  async createMaterial(
    input: CreateMaterialInput,
    userId: string
  ): Promise<MaterialWithDetails> {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: input.classId },
      include: { course: true },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Get the next order index for this week
    const existingMaterials = await prisma.courseMaterial.findMany({
      where: {
        classId: input.classId,
        week: input.week || null,
        deletedAt: null,
      },
      orderBy: { orderIndex: 'desc' },
      take: 1,
    });

    const orderIndex = existingMaterials.length > 0 ? existingMaterials[0].orderIndex + 1 : 0;

    const material = await prisma.courseMaterial.create({
      data: {
        classId: input.classId,
        title: input.title,
        description: input.description,
        type: input.type,
        fileUrl: input.fileUrl,
        externalUrl: input.externalUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        week: input.week,
        orderIndex,
        isPublished: input.isPublished || false,
        publishedAt: input.isPublished ? new Date() : null,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.CREATE,
      resource: 'CourseMaterial',
      resourceId: material.id,
      userId,
      newValues: { title: input.title, classId: input.classId },
    });

    return material as MaterialWithDetails;
  }

  /**
   * Get all materials for a class
   */
  async getMaterials(
    classId: string,
    includeUnpublished: boolean = false
  ): Promise<MaterialWithDetails[]> {
    const where: Prisma.CourseMaterialWhereInput = {
      classId,
      deletedAt: null,
    };

    if (!includeUnpublished) {
      where.isPublished = true;
    }

    const materials = await prisma.courseMaterial.findMany({
      where,
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [{ week: 'asc' }, { orderIndex: 'asc' }],
    });

    return materials as MaterialWithDetails[];
  }

  /**
   * Get materials organized by week
   */
  async getMaterialsByWeek(
    classId: string,
    includeUnpublished: boolean = false
  ): Promise<Map<number | null, MaterialWithDetails[]>> {
    const materials = await this.getMaterials(classId, includeUnpublished);

    const byWeek = new Map<number | null, MaterialWithDetails[]>();

    for (const material of materials) {
      const week = material.week;
      if (!byWeek.has(week)) {
        byWeek.set(week, []);
      }
      byWeek.get(week)!.push(material);
    }

    return byWeek;
  }

  /**
   * Get a single material by ID
   */
  async getMaterial(id: string): Promise<MaterialWithDetails> {
    const material = await prisma.courseMaterial.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!material) {
      throw AppError.notFound('Material not found');
    }

    return material as MaterialWithDetails;
  }

  /**
   * Update a material
   */
  async updateMaterial(
    id: string,
    input: UpdateMaterialInput,
    userId: string
  ): Promise<MaterialWithDetails> {
    const existing = await prisma.courseMaterial.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Material not found');
    }

    const material = await prisma.courseMaterial.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        fileUrl: input.fileUrl,
        externalUrl: input.externalUrl,
        week: input.week,
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'CourseMaterial',
      resourceId: id,
      userId,
      oldValues: { title: existing.title },
      newValues: input,
    });

    return material as MaterialWithDetails;
  }

  /**
   * Delete a material (soft delete)
   */
  async deleteMaterial(id: string, userId: string): Promise<void> {
    const existing = await prisma.courseMaterial.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Material not found');
    }

    await prisma.courseMaterial.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      action: AuditAction.DELETE,
      resource: 'CourseMaterial',
      resourceId: id,
      userId,
      oldValues: { title: existing.title },
    });
  }

  /**
   * Publish a material
   */
  async publishMaterial(id: string, userId: string): Promise<MaterialWithDetails> {
    const existing = await prisma.courseMaterial.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Material not found');
    }

    if (existing.isPublished) {
      throw AppError.badRequest('Material is already published');
    }

    const material = await prisma.courseMaterial.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'CourseMaterial',
      resourceId: id,
      userId,
      newValues: { isPublished: true },
    });

    return material as MaterialWithDetails;
  }

  /**
   * Unpublish a material
   */
  async unpublishMaterial(id: string, userId: string): Promise<MaterialWithDetails> {
    const existing = await prisma.courseMaterial.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Material not found');
    }

    if (!existing.isPublished) {
      throw AppError.badRequest('Material is not published');
    }

    const material = await prisma.courseMaterial.update({
      where: { id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'CourseMaterial',
      resourceId: id,
      userId,
      newValues: { isPublished: false },
    });

    return material as MaterialWithDetails;
  }

  /**
   * Reorder materials within a class (and optionally week)
   */
  async reorderMaterials(
    classId: string,
    orderedIds: string[],
    userId: string
  ): Promise<void> {
    // Verify all materials belong to the class
    const materials = await prisma.courseMaterial.findMany({
      where: {
        id: { in: orderedIds },
        classId,
        deletedAt: null,
      },
    });

    if (materials.length !== orderedIds.length) {
      throw AppError.badRequest('Some materials not found or do not belong to this class');
    }

    // Update order indices
    const updates = orderedIds.map((id, index) =>
      prisma.courseMaterial.update({
        where: { id },
        data: { orderIndex: index },
      })
    );

    await prisma.$transaction(updates);

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'CourseMaterial',
      resourceId: classId,
      userId,
      newValues: { reordered: orderedIds },
    });
  }

  /**
   * Get material statistics for a class
   */
  async getMaterialStats(classId: string): Promise<{
    total: number;
    published: number;
    byType: Record<string, number>;
    byWeek: Record<number, number>;
  }> {
    const materials = await prisma.courseMaterial.findMany({
      where: {
        classId,
        deletedAt: null,
      },
    });

    const byType: Record<string, number> = {};
    const byWeek: Record<number, number> = {};
    let published = 0;

    for (const material of materials) {
      if (material.isPublished) published++;

      byType[material.type] = (byType[material.type] || 0) + 1;

      if (material.week !== null) {
        byWeek[material.week] = (byWeek[material.week] || 0) + 1;
      }
    }

    return {
      total: materials.length,
      published,
      byType,
      byWeek,
    };
  }
}

export const courseMaterialsService = new CourseMaterialsService();
