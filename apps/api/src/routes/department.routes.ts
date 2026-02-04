import { Router, type Router as RouterType } from 'express';
import { departmentService } from '../services/department.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  departmentIdSchema,
} from '../validators/academic.validator.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments with pagination and filters
 * @access  Private (departments:read)
 */
router.get(
  '/',
  authorize('departments:read'),
  validate(departmentQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await departmentService.getDepartments(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * @route   POST /api/v1/departments
 * @desc    Create a new department
 * @access  Private (departments:create)
 */
router.post(
  '/',
  authorize('departments:create'),
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.createDepartment(req.body, req.user?.userId);
    return sendCreated(res, department, 'Department created successfully');
  })
);

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get department by ID
 * @access  Private (departments:read)
 */
router.get(
  '/:id',
  authorize('departments:read'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const department = await departmentService.getDepartmentById(req.params.id);
    return sendSuccess(res, department);
  })
);

/**
 * @route   PATCH /api/v1/departments/:id
 * @desc    Update department
 * @access  Private (departments:update)
 */
router.patch(
  '/:id',
  authorize('departments:update'),
  validate(departmentIdSchema, 'params'),
  validate(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.updateDepartment(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, department, 'Department updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    Delete department (soft delete)
 * @access  Private (departments:delete)
 */
router.delete(
  '/:id',
  authorize('departments:delete'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await departmentService.deleteDepartment(req.params.id, req.user?.userId);
    return sendSuccess(res, null, result.message);
  })
);

/**
 * @route   GET /api/v1/departments/:id/programs
 * @desc    Get programs for a department
 * @access  Private (departments:read)
 */
router.get(
  '/:id/programs',
  authorize('departments:read'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const programs = await departmentService.getPrograms(req.params.id);
    return sendSuccess(res, programs);
  })
);

/**
 * @route   GET /api/v1/departments/:id/courses
 * @desc    Get courses for a department
 * @access  Private (departments:read)
 */
router.get(
  '/:id/courses',
  authorize('departments:read'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const courses = await departmentService.getCourses(req.params.id);
    return sendSuccess(res, courses);
  })
);

/**
 * @route   GET /api/v1/departments/:id/employees
 * @desc    Get employees for a department
 * @access  Private (departments:read)
 */
router.get(
  '/:id/employees',
  authorize('departments:read'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const employees = await departmentService.getEmployees(req.params.id);
    return sendSuccess(res, employees);
  })
);

/**
 * @route   GET /api/v1/departments/:id/statistics
 * @desc    Get department statistics
 * @access  Private (departments:read)
 */
router.get(
  '/:id/statistics',
  authorize('departments:read'),
  validate(departmentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const statistics = await departmentService.getDepartmentStatistics(req.params.id);
    return sendSuccess(res, statistics);
  })
);

export default router;
