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
import roomRoutes from './room.routes.js';
import classRoutes from './class.routes.js';
import scheduleRoutes from './schedule.routes.js';
import registrationPeriodRoutes from './registrationPeriod.routes.js';
import holdRoutes from './hold.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import studentAttendanceRoutes from './studentAttendance.routes.js';
import employeeAttendanceRoutes from './employeeAttendance.routes.js';
import gradeScaleRoutes from './gradeScale.routes.js';
import gradeComponentRoutes from './gradeComponent.routes.js';
import gradeEntryRoutes from './gradeEntry.routes.js';
import examRoutes from './exam.routes.js';
import lecturerRoutes from './lecturer.routes.js';
import courseMaterialsRoutes from './courseMaterials.routes.js';
import hodRoutes from './hod.routes.js';
import deanRoutes from './dean.routes.js';
import leaveTypeRoutes from './leaveType.routes.js';
import leaveRequestRoutes from './leaveRequest.routes.js';
import salaryComponentRoutes from './salaryComponent.routes.js';
import payrollRoutes from './payroll.routes.js';
import employeePortalRoutes from './employeePortal.routes.js';
import libraryRoutes from './library.routes.js';

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

// API v1 routes - Class Management
router.use('/api/v1/rooms', roomRoutes);
router.use('/api/v1/classes', classRoutes);
router.use('/api/v1/schedules', scheduleRoutes);

// API v1 routes - Course Registration
router.use('/api/v1/registration-periods', registrationPeriodRoutes);
router.use('/api/v1/holds', holdRoutes);
router.use('/api/v1/enrollments', enrollmentRoutes);

// API v1 routes - Attendance
router.use('/api/v1/attendance', studentAttendanceRoutes);
router.use('/api/v1/employee-attendance', employeeAttendanceRoutes);

// API v1 routes - Grading System
router.use('/api/v1/grade-scales', gradeScaleRoutes);
router.use('/api/v1', gradeComponentRoutes);  // Contains /classes/:classId/components and /grade-components routes
router.use('/api/v1', gradeEntryRoutes);      // Contains /grade-components/:id/grades, /enrollments/:id/grades, etc.
router.use('/api/v1/exams', examRoutes);

// API v1 routes - Academic Portal
router.use('/api/v1/lecturer', lecturerRoutes);
router.use('/api/v1', courseMaterialsRoutes);  // Contains /classes/:classId/materials and /materials routes
router.use('/api/v1/hod', hodRoutes);
router.use('/api/v1/dean', deanRoutes);

// API v1 routes - Leave Management
router.use('/api/v1/leave-types', leaveTypeRoutes);
router.use('/api/v1/leave-requests', leaveRequestRoutes);
router.use('/api/v1/salary-components', salaryComponentRoutes);
router.use('/api/v1/payroll', payrollRoutes);

// API v1 routes - Employee Portal (self-service)
router.use('/api/v1/employee', employeePortalRoutes);

// API v1 routes - Library Management
router.use('/api/v1/library', libraryRoutes);

export default router;
