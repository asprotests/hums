import { Router, type Router as RouterType } from 'express';
import { budgetService } from '../services/budget.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
  allocateToCategorySchema,
  createExpenseSchema,
  transferBetweenCategoriesSchema,
} from '../validators/advancedFinance.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// ============================================
// Budget Routes
// ============================================

/**
 * @route   GET /api/v1/budgets
 * @desc    Get all budgets with filters
 * @access  Private (finance:read)
 */
router.get(
  '/',
  authenticate,
  authorize('payments:read'),
  validate(budgetQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await budgetService.getBudgets(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/budgets
 * @desc    Create a budget
 * @access  Private (finance:create)
 */
router.post(
  '/',
  authenticate,
  authorize('payments:create'),
  validate(createBudgetSchema),
  asyncHandler(async (req, res) => {
    const budget = await budgetService.createBudget(req.body, req.user!.userId);
    return sendCreated(res, budget, 'Budget created');
  })
);

/**
 * @route   GET /api/v1/budgets/:id
 * @desc    Get budget by ID with categories and expenses
 * @access  Private (finance:read)
 */
router.get(
  '/:id',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const budget = await budgetService.getBudgetById(req.params.id);
    return sendSuccess(res, budget);
  })
);

/**
 * @route   PATCH /api/v1/budgets/:id
 * @desc    Update budget
 * @access  Private (finance:update)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('payments:update'),
  validate(updateBudgetSchema),
  asyncHandler(async (req, res) => {
    const budget = await budgetService.updateBudget(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, budget, 'Budget updated');
  })
);

/**
 * @route   DELETE /api/v1/budgets/:id
 * @desc    Delete budget (only draft with no expenses)
 * @access  Private (finance:delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('payments:delete'),
  asyncHandler(async (req, res) => {
    await budgetService.deleteBudget(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Budget deleted');
  })
);

/**
 * @route   POST /api/v1/budgets/:id/activate
 * @desc    Activate budget
 * @access  Private (finance:update)
 */
router.post(
  '/:id/activate',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const budget = await budgetService.activateBudget(req.params.id, req.user!.userId);
    return sendSuccess(res, budget, 'Budget activated');
  })
);

/**
 * @route   POST /api/v1/budgets/:id/close
 * @desc    Close budget
 * @access  Private (finance:update)
 */
router.post(
  '/:id/close',
  authenticate,
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const budget = await budgetService.closeBudget(req.params.id, req.user!.userId);
    return sendSuccess(res, budget, 'Budget closed');
  })
);

/**
 * @route   POST /api/v1/budgets/:id/categories
 * @desc    Allocate to category
 * @access  Private (finance:create)
 */
router.post(
  '/:id/categories',
  authenticate,
  authorize('payments:create'),
  validate(allocateToCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await budgetService.allocateToCategory(
      req.params.id,
      req.body.name,
      req.body.amount,
      req.user!.userId
    );
    return sendCreated(res, category, 'Category allocation updated');
  })
);

/**
 * @route   POST /api/v1/budgets/:id/expenses
 * @desc    Record expense
 * @access  Private (finance:create)
 */
router.post(
  '/:id/expenses',
  authenticate,
  authorize('payments:create'),
  validate(createExpenseSchema),
  asyncHandler(async (req, res) => {
    const expense = await budgetService.recordExpense(
      {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      },
      req.user!.userId
    );
    return sendCreated(res, expense, 'Expense recorded');
  })
);

/**
 * @route   GET /api/v1/budgets/:id/report
 * @desc    Get budget vs actual report
 * @access  Private (finance:read)
 */
router.get(
  '/:id/report',
  authenticate,
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const report = await budgetService.getBudgetReport(req.params.id);
    return sendSuccess(res, report);
  })
);

/**
 * @route   POST /api/v1/budgets/:id/transfer
 * @desc    Transfer between categories
 * @access  Private (finance:update)
 */
router.post(
  '/:id/transfer',
  authenticate,
  authorize('payments:update'),
  validate(transferBetweenCategoriesSchema),
  asyncHandler(async (req, res) => {
    const result = await budgetService.transferBetweenCategories(
      req.body.fromCategoryId,
      req.body.toCategoryId,
      req.body.amount,
      req.user!.userId
    );
    return sendSuccess(res, result, 'Transfer completed');
  })
);

export default router;
