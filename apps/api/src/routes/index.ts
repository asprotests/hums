import { Router, type Router as RouterType } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import roleRoutes from './role.routes.js';
import configRoutes from './config.routes.js';
import academicYearRoutes from './academicYear.routes.js';
import semesterRoutes from './semester.routes.js';
import facultyRoutes from './faculty.routes.js';
import departmentRoutes from './department.routes.js';
import programRoutes from './program.routes.js';
import courseRoutes from './course.routes.js';
import admissionRoutes from './admission.routes.js';
import studentRoutes from './student.routes.js';
import feeStructureRoutes from './feeStructure.routes.js';
import invoiceRoutes from './invoice.routes.js';
import paymentRoutes from './payment.routes.js';
import financeRoutes from './finance.routes.js';
import studentPortalRoutes from './studentPortal.routes.js';
import auditRoutes from './audit.routes.js';

const router: RouterType = Router();

// Health check routes
router.use('/health', healthRoutes);

// API v1 routes - Auth & User Management
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/roles', roleRoutes);

// API v1 routes - System Configuration
router.use('/api/v1/config', configRoutes);

// API v1 routes - Academic Structure
router.use('/api/v1/academic-years', academicYearRoutes);
router.use('/api/v1/semesters', semesterRoutes);
router.use('/api/v1/faculties', facultyRoutes);
router.use('/api/v1/departments', departmentRoutes);
router.use('/api/v1/programs', programRoutes);
router.use('/api/v1/courses', courseRoutes);

// API v1 routes - Student Management
router.use('/api/v1/admissions', admissionRoutes);
router.use('/api/v1/students', studentRoutes);

// API v1 routes - Finance
router.use('/api/v1/fee-structures', feeStructureRoutes);
router.use('/api/v1/invoices', invoiceRoutes);
router.use('/api/v1/payments', paymentRoutes);
router.use('/api/v1/finance', financeRoutes);

// API v1 routes - Student Portal (self-service)
router.use('/api/v1/student', studentPortalRoutes);

// API v1 routes - Audit Logs
router.use('/api/v1/audit-logs', auditRoutes);

export default router;
