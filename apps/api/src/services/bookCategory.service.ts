import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

export interface CreateCategoryInput {
  name: string;
  nameLocal?: string;
  code: string;
  parentId?: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  parentId?: string | null;
  description?: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  nameLocal: string | null;
  code: string;
  description: string | null;
  bookCount: number;
  children: CategoryTreeNode[];
}

class BookCategoryService {
  /**
   * Get all categories
   */
  async getCategories(includeBookCount = true) {
    const categories = await prisma.bookCategory.findMany({
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: includeBookCount ? {
          select: { books: true },
        } : undefined,
      },
      orderBy: { name: 'asc' },
    });

    return categories.map(cat => ({
      ...cat,
      bookCount: cat._count?.books ?? 0,
      _count: undefined,
    }));
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const categories = await prisma.bookCategory.findMany({
      include: {
        _count: { select: { books: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create all nodes
    for (const cat of categories) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        nameLocal: cat.nameLocal,
        code: cat.code,
        description: cat.description,
        bookCount: cat._count.books,
        children: [],
      });
    }

    // Second pass: build tree
    for (const cat of categories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string) {
    const category = await prisma.bookCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        _count: { select: { books: true } },
      },
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    return {
      ...category,
      bookCount: category._count.books,
      _count: undefined,
    };
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryInput, userId: string) {
    // Check for duplicate name
    const existing = await prisma.bookCategory.findFirst({
      where: {
        OR: [
          { name: data.name },
          { code: data.code },
        ],
      },
    });

    if (existing) {
      if (existing.name === data.name) {
        throw AppError.badRequest('A category with this name already exists');
      }
      throw AppError.badRequest('A category with this code already exists');
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await prisma.bookCategory.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw AppError.badRequest('Parent category not found');
      }
    }

    const category = await prisma.bookCategory.create({
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code.toUpperCase(),
        parentId: data.parentId,
        description: data.description,
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
      },
    });

    await auditService.log({
      action: 'CREATE',
      resource: 'BookCategory',
      resourceId: category.id,
      userId,
      newValues: data,
    });

    return category;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: UpdateCategoryInput, userId: string) {
    const category = await prisma.bookCategory.findUnique({ where: { id } });
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    // Check for duplicate name/code
    if (data.name || data.code) {
      const existing = await prisma.bookCategory.findFirst({
        where: {
          id: { not: id },
          OR: [
            data.name ? { name: data.name } : {},
            data.code ? { code: data.code } : {},
          ].filter(obj => Object.keys(obj).length > 0),
        },
      });

      if (existing) {
        throw AppError.badRequest('A category with this name or code already exists');
      }
    }

    // Validate parent if changing
    if (data.parentId) {
      if (data.parentId === id) {
        throw AppError.badRequest('A category cannot be its own parent');
      }
      const parent = await prisma.bookCategory.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw AppError.badRequest('Parent category not found');
      }
    }

    const updated = await prisma.bookCategory.update({
      where: { id },
      data: {
        name: data.name,
        nameLocal: data.nameLocal,
        code: data.code?.toUpperCase(),
        parentId: data.parentId,
        description: data.description,
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'BookCategory',
      resourceId: id,
      userId,
      oldValues: category,
      newValues: data,
    });

    return updated;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string, userId: string) {
    const category = await prisma.bookCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { books: true, children: true } },
      },
    });

    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (category._count.books > 0) {
      throw AppError.badRequest('Cannot delete category with books. Move or delete books first.');
    }

    if (category._count.children > 0) {
      throw AppError.badRequest('Cannot delete category with subcategories. Delete subcategories first.');
    }

    await prisma.bookCategory.delete({ where: { id } });

    await auditService.log({
      action: 'DELETE',
      resource: 'BookCategory',
      resourceId: id,
      userId,
      oldValues: category,
    });
  }
}

export const bookCategoryService = new BookCategoryService();
