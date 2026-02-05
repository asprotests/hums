import { Router, type Router as RouterType } from 'express';
import { gradeEntryService } from '../services/gradeEntry.service.js';
import { gradeCalculationService } from '../services/gradeCalculation.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  enterGradesSchema,
  updateGradeEntrySchema,
  finalizeGradesSchema,
  unfinalizeGradesSchema,
} from '../validators/grading.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/grade-components/:id/grades
 * @desc    Get all grade entries for a component
 * @access  Private (grades:read)
 */
router.get(
  '/grade-components/:id/grades',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const result = await gradeEntryService.getComponentGrades(req.params.id);
    return sendSuccess(res, result);
  })
);

/**
 * @route   POST /api/v1/grade-components/:id/grades
 * @desc    Enter grades for a component (bulk)
 * @access  Private (grades:create)
 */
router.post(
  '/grade-components/:id/grades',
  authorize('grades:create'),
  validate(enterGradesSchema),
  asyncHandler(async (req, res) => {
    const entries = await gradeEntryService.enterGrades(
      req.params.id,
      req.body.grades,
      req.user!.userId
    );
    return sendCreated(res, entries, `${entries.length} grade entries saved successfully`);
  })
);

/**
 * @route   GET /api/v1/grade-entries/:id
 * @desc    Get grade entry by ID
 * @access  Private (grades:read)
 */
router.get(
  '/grade-entries/:id',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    // This would need a service method; using student grades as proxy
    const entries = await gradeEntryService.getStudentGrades(req.params.id);
    return sendSuccess(res, entries);
  })
);

/**
 * @route   PATCH /api/v1/grade-entries/:id
 * @desc    Update a single grade entry
 * @access  Private (grades:update)
 */
router.patch(
  '/grade-entries/:id',
  authorize('grades:update'),
  validate(updateGradeEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await gradeEntryService.updateGrade(
      req.params.id,
      req.body.score,
      req.body.remarks,
      req.user!.userId
    );
    return sendSuccess(res, entry, 'Grade entry updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/grade-entries/:id
 * @desc    Delete a grade entry
 * @access  Private (grades:delete)
 */
router.delete(
  '/grade-entries/:id',
  authorize('grades:delete'),
  asyncHandler(async (req, res) => {
    await gradeEntryService.deleteGrade(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Grade entry deleted successfully');
  })
);

/**
 * @route   GET /api/v1/enrollments/:id/grades
 * @desc    Get grades for a specific enrollment
 * @access  Private (grades:read)
 */
router.get(
  '/enrollments/:id/grades',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const result = await gradeCalculationService.getEnrollmentGrades(req.params.id);
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/classes/:classId/grades
 * @desc    Calculate grades for all students in a class
 * @access  Private (grades:read)
 */
router.get(
  '/classes/:classId/grades',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const grades = await gradeCalculationService.calculateClassGrades(req.params.classId);
    return sendSuccess(res, grades);
  })
);

/**
 * @route   POST /api/v1/classes/:classId/grades/finalize
 * @desc    Finalize grades for a class
 * @access  Private (grades:finalize)
 */
router.post(
  '/classes/:classId/grades/finalize',
  authorize('grades:finalize'),
  validate(finalizeGradesSchema),
  asyncHandler(async (req, res) => {
    const grades = await gradeCalculationService.finalizeClassGrades(
      req.params.classId,
      req.user!.userId
    );
    return sendSuccess(res, grades, `Grades finalized for ${grades.length} students`);
  })
);

/**
 * @route   POST /api/v1/classes/:classId/grades/unfinalize
 * @desc    Unfinalize grades for a class (admin only)
 * @access  Private (grades:unfinalize)
 */
router.post(
  '/classes/:classId/grades/unfinalize',
  authorize('grades:unfinalize'),
  validate(unfinalizeGradesSchema),
  asyncHandler(async (req, res) => {
    await gradeCalculationService.unfinalizeClassGrades(
      req.params.classId,
      req.body.reason,
      req.user!.userId
    );
    return sendSuccess(res, null, 'Grades unfinalized successfully');
  })
);

/**
 * @route   GET /api/v1/students/:studentId/gpa
 * @desc    Get GPA details for a student
 * @access  Private (grades:read)
 */
router.get(
  '/students/:studentId/gpa',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const semesterId = req.query.semesterId as string | undefined;
    const gpaDetails = await gradeCalculationService.getGPADetails(
      req.params.studentId,
      semesterId
    );
    return sendSuccess(res, gpaDetails);
  })
);

/**
 * @route   GET /api/v1/students/:studentId/transcript
 * @desc    Generate transcript for a student
 * @access  Private (grades:read)
 */
router.get(
  '/students/:studentId/transcript',
  authorize('grades:read'),
  asyncHandler(async (req, res) => {
    const official = req.query.official === 'true';
    const transcript = await gradeCalculationService.generateTranscript(
      req.params.studentId,
      official
    );
    return sendSuccess(res, transcript);
  })
);

export default router;
