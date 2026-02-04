import { Router, type Router as RouterType } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import roleRoutes from './role.routes.js';
import academicYearRoutes from './academicYear.routes.js';
import semesterRoutes from './semester.routes.js';
import facultyRoutes from './faculty.routes.js';
import departmentRoutes from './department.routes.js';
import programRoutes from './program.routes.js';
import courseRoutes from './course.routes.js';

const router: RouterType = Router();

// Health check routes
router.use('/health', healthRoutes);

// API v1 routes - Auth & User Management
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/roles', roleRoutes);

// API v1 routes - Academic Structure
router.use('/api/v1/academic-years', academicYearRoutes);
router.use('/api/v1/semesters', semesterRoutes);
router.use('/api/v1/faculties', facultyRoutes);
router.use('/api/v1/departments', departmentRoutes);
router.use('/api/v1/programs', programRoutes);
router.use('/api/v1/courses', courseRoutes);

// Future routes
// router.use('/api/v1/students', studentRoutes);
// router.use('/api/v1/employees', employeeRoutes);
// etc.

export default router;
