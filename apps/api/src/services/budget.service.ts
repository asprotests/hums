import { prisma, Prisma } from '@hums/database';
import type { BudgetStatus } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

interface CreateBudgetInput {
  name: string;
  departmentId?: string;
  fiscalYear: string;
  totalAmount: number;
  notes?: string;
  categories?: Array<{
    name: string;
    allocatedAmount: number;
  }>;
}

interface UpdateBudgetInput {
  name?: string;
  totalAmount?: number;
  status?: BudgetStatus;
  notes?: string;
}

interface BudgetQueryInput {
  departmentId?: string;
  fiscalYear?: string;
  status?: BudgetStatus;
  page?: number;
  limit?: number;
}

interface CreateExpenseInput {
  categoryId: string;
  amount: number;
  description: string;
  date?: Date;
  reference?: string;
}

export class BudgetService {
  /**
   * Create a budget
   */
  async createBudget(data: CreateBudgetInput, userId: string) {
    // Validate department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId, deletedAt: null },
      });
      if (!department) {
        throw AppError.notFound('Department not found');
      }
    }

    // Check for existing budget with same department and fiscal year
    const existing = await prisma.budget.findFirst({
      where: {
        departmentId: data.departmentId || null,
        fiscalYear: data.fiscalYear,
      },
    });

    if (existing) {
      throw AppError.badRequest('Budget already exists for this department and fiscal year');
    }

    // Validate categories allocation doesn't exceed total
    if (data.categories) {
      const totalAllocated = data.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
      if (totalAllocated > data.totalAmount) {
        throw AppError.badRequest('Category allocations exceed total budget amount');
      }
    }

    const budget = await prisma.budget.create({
      data: {
        name: data.name,
        departmentId: data.departmentId,
        fiscalYear: data.fiscalYear,
        totalAmount: data.totalAmount,
        notes: data.notes,
        status: 'DRAFT',
        categories: data.categories
          ? {
              create: data.categories.map(c => ({
                name: c.name,
                allocatedAmount: c.allocatedAmount,
              })),
            }
          : undefined,
      },
      include: {
        department: true,
        categories: {
          include: {
            _count: { select: { expenses: true } },
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: 'CREATE',
      resource: 'Budget',
      resourceId: budget.id,
      newValues: data,
    });

    return budget;
  }

  /**
   * Get budgets with filtering and pagination
   */
  async getBudgets(query: BudgetQueryInput = {}) {
    const { departmentId, fiscalYear, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BudgetWhereInput = {};

    if (departmentId) where.departmentId = departmentId;
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (status) where.status = status;

    const [budgets, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        include: {
          department: true,
          categories: {
            include: {
              expenses: {
                select: { amount: true },
              },
            },
          },
        },
        orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.budget.count({ where }),
    ]);

    // Calculate spent and remaining for each budget
    const budgetsWithStats = budgets.map(budget => {
      const spentAmount = budget.categories.reduce((sum, cat) => {
        const catSpent = cat.expenses.reduce((s, e) => s + Number(e.amount), 0);
        return sum + catSpent;
      }, 0);

      const allocatedAmount = budget.categories.reduce(
        (sum, cat) => sum + Number(cat.allocatedAmount),
        0
      );

      return {
        ...budget,
        stats: {
          totalAmount: Number(budget.totalAmount),
          allocatedAmount,
          spentAmount,
          remainingAmount: Number(budget.totalAmount) - spentAmount,
          utilizationPercentage: (spentAmount / Number(budget.totalAmount)) * 100,
        },
      };
    });

    return {
      data: budgetsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(id: string) {
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        department: true,
        categories: {
          include: {
            expenses: {
              include: {
                recordedBy: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
              orderBy: { date: 'desc' },
            },
          },
        },
      },
    });

    if (!budget) {
      throw AppError.notFound('Budget not found');
    }

    // Calculate stats
    const spentAmount = budget.categories.reduce((sum, cat) => {
      const catSpent = cat.expenses.reduce((s, e) => s + Number(e.amount), 0);
      return sum + catSpent;
    }, 0);

    const allocatedAmount = budget.categories.reduce(
      (sum, cat) => sum + Number(cat.allocatedAmount),
      0
    );

    // Calculate per-category stats
    const categoriesWithStats = budget.categories.map(cat => {
      const spent = cat.expenses.reduce((s, e) => s + Number(e.amount), 0);
      return {
        ...cat,
        stats: {
          allocatedAmount: Number(cat.allocatedAmount),
          spentAmount: spent,
          remainingAmount: Number(cat.allocatedAmount) - spent,
          utilizationPercentage: (spent / Number(cat.allocatedAmount)) * 100,
        },
      };
    });

    return {
      ...budget,
      categories: categoriesWithStats,
      stats: {
        totalAmount: Number(budget.totalAmount),
        allocatedAmount,
        spentAmount,
        remainingAmount: Number(budget.totalAmount) - spentAmount,
        utilizationPercentage: (spentAmount / Number(budget.totalAmount)) * 100,
      },
    };
  }

  /**
   * Update budget
   */
  async updateBudget(id: string, data: UpdateBudgetInput, userId: string) {
    const existing = await prisma.budget.findUnique({
      where: { id },
      include: { categories: true },
    });

    if (!existing) {
      throw AppError.notFound('Budget not found');
    }

    // Can't reduce total below current allocations
    if (data.totalAmount !== undefined) {
      const currentAllocated = existing.categories.reduce(
        (sum, c) => sum + Number(c.allocatedAmount),
        0
      );
      if (data.totalAmount < currentAllocated) {
        throw AppError.badRequest('Cannot reduce total below current category allocations');
      }
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: data.name,
        totalAmount: data.totalAmount,
        status: data.status,
        notes: data.notes,
      },
      include: {
        department: true,
        categories: true,
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'Budget',
      resourceId: id,
      oldValues: existing,
      newValues: data,
    });

    return budget;
  }

  /**
   * Delete budget (only if draft with no expenses)
   */
  async deleteBudget(id: string, userId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        categories: {
          include: { _count: { select: { expenses: true } } },
        },
      },
    });

    if (!budget) {
      throw AppError.notFound('Budget not found');
    }

    if (budget.status !== 'DRAFT') {
      throw AppError.badRequest('Can only delete draft budgets');
    }

    const hasExpenses = budget.categories.some(c => c._count.expenses > 0);
    if (hasExpenses) {
      throw AppError.badRequest('Cannot delete budget with existing expenses');
    }

    await prisma.budget.delete({ where: { id } });

    await auditService.log({
      userId,
      action: 'DELETE',
      resource: 'Budget',
      resourceId: id,
      oldValues: budget,
    });

    return { success: true };
  }

  /**
   * Allocate to category (create or update)
   */
  async allocateToCategory(
    budgetId: string,
    name: string,
    amount: number,
    userId: string
  ) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { categories: true },
    });

    if (!budget) {
      throw AppError.notFound('Budget not found');
    }

    // Check if allocation would exceed budget
    const currentAllocated = budget.categories.reduce(
      (sum, c) => sum + Number(c.allocatedAmount),
      0
    );
    const existingCategory = budget.categories.find(c => c.name === name);
    const existingAmount = existingCategory ? Number(existingCategory.allocatedAmount) : 0;
    const newTotal = currentAllocated - existingAmount + amount;

    if (newTotal > Number(budget.totalAmount)) {
      throw AppError.badRequest('Allocation would exceed budget total');
    }

    let category;
    if (existingCategory) {
      category = await prisma.budgetCategory.update({
        where: { id: existingCategory.id },
        data: { allocatedAmount: amount },
      });
    } else {
      category = await prisma.budgetCategory.create({
        data: {
          budgetId,
          name,
          allocatedAmount: amount,
        },
      });
    }

    await auditService.log({
      userId,
      action: existingCategory ? 'UPDATE' : 'CREATE',
      resource: 'BudgetCategory',
      resourceId: category.id,
      newValues: { name, allocatedAmount: amount },
    });

    return category;
  }

  /**
   * Record expense
   */
  async recordExpense(data: CreateExpenseInput, userId: string) {
    const category = await prisma.budgetCategory.findUnique({
      where: { id: data.categoryId },
      include: {
        budget: true,
        expenses: { select: { amount: true } },
      },
    });

    if (!category) {
      throw AppError.notFound('Budget category not found');
    }

    if (category.budget.status !== 'ACTIVE') {
      throw AppError.badRequest('Budget is not active');
    }

    // Check if expense would exceed category allocation
    const currentSpent = category.expenses.reduce((s, e) => s + Number(e.amount), 0);
    if (currentSpent + data.amount > Number(category.allocatedAmount)) {
      throw AppError.badRequest('Expense would exceed category allocation');
    }

    const expense = await prisma.budgetExpense.create({
      data: {
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.date || new Date(),
        reference: data.reference,
        recordedById: userId,
      },
      include: {
        category: {
          include: { budget: true },
        },
        recordedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    await auditService.log({
      userId,
      action: 'CREATE',
      resource: 'BudgetExpense',
      resourceId: expense.id,
      newValues: data,
    });

    return expense;
  }

  /**
   * Get budget vs actual report
   */
  async getBudgetReport(id: string) {
    const budget = await this.getBudgetById(id);

    // Group expenses by month
    const expensesByMonth: Record<string, number> = {};
    for (const category of budget.categories) {
      for (const expense of category.expenses) {
        const month = new Date(expense.date).toISOString().slice(0, 7);
        expensesByMonth[month] = (expensesByMonth[month] || 0) + Number(expense.amount);
      }
    }

    return {
      budget: {
        id: budget.id,
        name: budget.name,
        fiscalYear: budget.fiscalYear,
        department: budget.department,
        status: budget.status,
      },
      summary: budget.stats,
      categories: budget.categories.map(c => ({
        id: c.id,
        name: c.name,
        ...c.stats,
      })),
      monthlySpending: Object.entries(expensesByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount })),
    };
  }

  /**
   * Transfer between categories
   */
  async transferBetweenCategories(
    fromId: string,
    toId: string,
    amount: number,
    userId: string
  ) {
    const [fromCategory, toCategory] = await Promise.all([
      prisma.budgetCategory.findUnique({
        where: { id: fromId },
        include: {
          budget: true,
          expenses: { select: { amount: true } },
        },
      }),
      prisma.budgetCategory.findUnique({
        where: { id: toId },
        include: { budget: true },
      }),
    ]);

    if (!fromCategory || !toCategory) {
      throw AppError.notFound('Category not found');
    }

    if (fromCategory.budgetId !== toCategory.budgetId) {
      throw AppError.badRequest('Categories must be from the same budget');
    }

    if (fromCategory.budget.status !== 'ACTIVE') {
      throw AppError.badRequest('Budget is not active');
    }

    // Check if transfer amount is available
    const fromSpent = fromCategory.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const fromAvailable = Number(fromCategory.allocatedAmount) - fromSpent;

    if (amount > fromAvailable) {
      throw AppError.badRequest('Transfer amount exceeds available funds');
    }

    await prisma.$transaction([
      prisma.budgetCategory.update({
        where: { id: fromId },
        data: { allocatedAmount: Number(fromCategory.allocatedAmount) - amount },
      }),
      prisma.budgetCategory.update({
        where: { id: toId },
        data: { allocatedAmount: Number(toCategory.allocatedAmount) + amount },
      }),
    ]);

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'BudgetCategory',
      resourceId: `${fromId}->${toId}`,
      newValues: { fromId, toId, amount },
    });

    return { success: true, transferredAmount: amount };
  }

  /**
   * Activate budget
   */
  async activateBudget(id: string, userId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw AppError.notFound('Budget not found');
    }

    if (budget.status !== 'DRAFT') {
      throw AppError.badRequest('Can only activate draft budgets');
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'Budget',
      resourceId: id,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'ACTIVE' },
    });

    return updated;
  }

  /**
   * Close budget
   */
  async closeBudget(id: string, userId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw AppError.notFound('Budget not found');
    }

    if (budget.status !== 'ACTIVE') {
      throw AppError.badRequest('Can only close active budgets');
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'Budget',
      resourceId: id,
      oldValues: { status: 'ACTIVE' },
      newValues: { status: 'CLOSED' },
    });

    return updated;
  }
}

export const budgetService = new BudgetService();
