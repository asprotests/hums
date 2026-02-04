import { Router, type Router as RouterType } from 'express';
import { studentService } from '../services/student.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  studentQuerySchema,
  updateStudentSchema,
  studentIdSchema,
  transferStudentSchema,
  deactivateStudentSchema,
} from '../validators/admission.validator.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/index.js';
import { z } from 'zod';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/students
 * @desc    Get all students
 * @access  Private (students:read)
 */
router.get(
  '/',
  authorize('students:read'),
  validate(studentQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const students = await studentService.getStudents(req.query as any);
    return sendPaginated(res, students.data, students.pagination);
  })
);

/**
 * @route   GET /api/v1/students/:id
 * @desc    Get student by ID
 * @access  Private (students:read)
 */
router.get(
  '/:id',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const student = await studentService.getStudentById(req.params.id);
    return sendSuccess(res, student);
  })
);

/**
 * @route   PATCH /api/v1/students/:id
 * @desc    Update student
 * @access  Private (students:update)
 */
router.patch(
  '/:id',
  authorize('students:update'),
  validate(studentIdSchema, 'params'),
  validate(updateStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.updateStudent(req.params.id, req.body, req.user?.userId);
    return sendSuccess(res, student, 'Student updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/students/:id
 * @desc    Delete student (soft delete)
 * @access  Private (students:delete)
 */
router.delete(
  '/:id',
  authorize('students:delete'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await studentService.deleteStudent(req.params.id, req.user!.userId);
    return sendSuccess(res, result);
  })
);

/**
 * @route   POST /api/v1/students/:id/deactivate
 * @desc    Deactivate student (suspend/withdraw)
 * @access  Private (students:update)
 */
router.post(
  '/:id/deactivate',
  authorize('students:update'),
  validate(studentIdSchema, 'params'),
  validate(deactivateStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.deactivateStudent(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, student, 'Student deactivated successfully');
  })
);

/**
 * @route   POST /api/v1/students/:id/transfer
 * @desc    Transfer student to another program
 * @access  Private (students:update)
 */
router.post(
  '/:id/transfer',
  authorize('students:update'),
  validate(studentIdSchema, 'params'),
  validate(transferStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.transferStudent(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, student, 'Student transferred successfully');
  })
);

/**
 * @route   GET /api/v1/students/:id/enrollments
 * @desc    Get student enrollments
 * @access  Private (students:read)
 */
router.get(
  '/:id/enrollments',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  validate(z.object({ semesterId: z.string().uuid().optional() }).partial(), 'query'),
  asyncHandler(async (req, res) => {
    const enrollments = await studentService.getEnrollments(req.params.id, req.query.semesterId as string);
    return sendSuccess(res, enrollments);
  })
);

/**
 * @route   GET /api/v1/students/:id/grades
 * @desc    Get student grades
 * @access  Private (students:read)
 */
router.get(
  '/:id/grades',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const grades = await studentService.getGrades(req.params.id);
    return sendSuccess(res, grades);
  })
);

/**
 * @route   GET /api/v1/students/:id/payments
 * @desc    Get student payments
 * @access  Private (students:read)
 */
router.get(
  '/:id/payments',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const payments = await studentService.getPayments(req.params.id);
    return sendSuccess(res, payments);
  })
);

/**
 * @route   GET /api/v1/students/:id/attendance
 * @desc    Get student attendance
 * @access  Private (students:read)
 */
router.get(
  '/:id/attendance',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  validate(z.object({ semesterId: z.string().uuid().optional() }).partial(), 'query'),
  asyncHandler(async (req, res) => {
    const attendance = await studentService.getAttendance(req.params.id, req.query.semesterId as string);
    return sendSuccess(res, attendance);
  })
);

/**
 * @route   GET /api/v1/students/:id/documents
 * @desc    Get student documents
 * @access  Private (students:read)
 */
router.get(
  '/:id/documents',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const documents = await studentService.getDocuments(req.params.id);
    return sendSuccess(res, documents);
  })
);

/**
 * @route   POST /api/v1/students/:id/documents
 * @desc    Upload student document
 * @access  Private (students:update)
 */
router.post(
  '/:id/documents',
  authorize('students:update'),
  validate(studentIdSchema, 'params'),
  validate(z.object({
    type: z.enum(['ID_CARD', 'PASSPORT', 'CERTIFICATE', 'PHOTO', 'TRANSCRIPT', 'OTHER']),
    fileName: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    path: z.string(),
    url: z.string().url().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { type, ...file } = req.body;
    const document = await studentService.uploadDocument(
      req.params.id,
      file,
      type,
      req.user!.userId
    );
    return sendSuccess(res, document, 'Document uploaded successfully');
  })
);

/**
 * @route   DELETE /api/v1/students/:id/documents/:documentId
 * @desc    Delete student document
 * @access  Private (students:update)
 */
router.delete(
  '/:id/documents/:documentId',
  authorize('students:update'),
  validate(z.object({
    id: z.string().uuid(),
    documentId: z.string().uuid(),
  }), 'params'),
  asyncHandler(async (req, res) => {
    const result = await studentService.deleteDocument(
      req.params.id,
      req.params.documentId,
      req.user!.userId
    );
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/students/:id/transcript
 * @desc    Generate student transcript
 * @access  Private (students:read)
 */
router.get(
  '/:id/transcript',
  authorize('students:read'),
  validate(studentIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const transcript = await studentService.generateTranscript(req.params.id);
    return sendSuccess(res, transcript);
  })
);

export default router;
