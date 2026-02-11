import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { salaryComponentService } from '../services/salaryComponent.service.js';
import {
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  assignComponentSchema,
} from '../validators/leavePayroll.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/salary-components
 * Get all salary components
 */
router.get(
  '/',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const components = await salaryComponentService.getSalaryComponents(includeInactive);
    return sendSuccess(res, components);
  })
);

/**
 * GET /api/v1/salary-components/:id
 * Get salary component by ID
 */
router.get(
  '/:id',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const component = await salaryComponentService.getComponentById(req.params.id);
    return sendSuccess(res, component);
  })
);

/**
 * POST /api/v1/salary-components
 * Create a new salary component
 */
router.post(
  '/',
  authorize('payroll:create'),
  validate(createSalaryComponentSchema),
  asyncHandler(async (req, res) => {
    const component = await salaryComponentService.createComponent(req.body, req.user!.userId);
    return sendCreated(res, component);
  })
);

/**
 * PATCH /api/v1/salary-components/:id
 * Update a salary component
 */
router.patch(
  '/:id',
  authorize('payroll:update'),
  validate(updateSalaryComponentSchema),
  asyncHandler(async (req, res) => {
    const component = await salaryComponentService.updateComponent(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, component);
  })
);

/**
 * POST /api/v1/salary-components/:id/assign
 * Assign a component to an employee
 */
router.post(
  '/:id/assign',
  authorize('payroll:update'),
  validate(assignComponentSchema),
  asyncHandler(async (req, res) => {
    const { employeeId, value } = req.body;
    const assignment = await salaryComponentService.assignToEmployee(
      req.params.id,
      employeeId,
      value,
      req.user!.userId
    );
    return sendSuccess(res, assignment, 'Component assigned successfully');
  })
);

/**
 * DELETE /api/v1/salary-components/:id/assign/:employeeId
 * Remove a component assignment from an employee
 */
router.delete(
  '/:id/assign/:employeeId',
  authorize('payroll:update'),
  asyncHandler(async (req, res) => {
    await salaryComponentService.removeFromEmployee(
      req.params.id,
      req.params.employeeId,
      req.user!.userId
    );
    return sendSuccess(res, null, 'Component assignment removed');
  })
);

/**
 * GET /api/v1/salary-components/employee/:employeeId
 * Get employee's salary components
 */
router.get(
  '/employee/:employeeId',
  authorize('payroll:read'),
  asyncHandler(async (req, res) => {
    const components = await salaryComponentService.getEmployeeComponents(req.params.employeeId);
    return sendSuccess(res, components);
  })
);

/**
 * POST /api/v1/salary-components/initialize
 * Initialize default salary components
 */
router.post(
  '/initialize',
  authorize('payroll:create'),
  asyncHandler(async (req, res) => {
    await salaryComponentService.initializeDefaultComponents(req.user!.userId);
    return sendSuccess(res, null, 'Default salary components initialized');
  })
);

export default router;
