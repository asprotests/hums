import { z } from 'zod';

// ============ Academic Year Validators ============

export const createAcademicYearSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^\d{4}-\d{4}$/, 'Name must be in format YYYY-YYYY (e.g., 2025-2026)'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const updateAcademicYearSchema = z.object({
  name: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Name must be in format YYYY-YYYY')
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const academicYearIdSchema = z.object({
  id: z.string().uuid('Invalid academic year ID'),
});

// ============ Semester Validators ============

export const createSemesterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  academicYearId: z.string().uuid('Invalid academic year ID'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationStart: z.coerce.date(),
  registrationEnd: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine((data) => data.registrationEnd > data.registrationStart, {
  message: 'Registration end must be after registration start',
  path: ['registrationEnd'],
}).refine((data) => data.registrationEnd <= data.endDate, {
  message: 'Registration must end before or on semester end date',
  path: ['registrationEnd'],
});

export const updateSemesterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  registrationStart: z.coerce.date().optional(),
  registrationEnd: z.coerce.date().optional(),
});

export const semesterQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
});

export const semesterIdSchema = z.object({
  id: z.string().uuid('Invalid semester ID'),
});

// ============ Faculty Validators ============

export const createFacultySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  nameLocal: z.string().max(200).optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code cannot exceed 10 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens'),
  deanId: z.string().uuid('Invalid dean ID').optional().nullable(),
});

export const updateFacultySchema = z.object({
  name: z.string().min(3).max(200).optional(),
  nameLocal: z.string().max(200).optional().nullable(),
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens')
    .optional(),
  deanId: z.string().uuid('Invalid dean ID').optional().nullable(),
});

export const facultyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const facultyIdSchema = z.object({
  id: z.string().uuid('Invalid faculty ID'),
});

// ============ Department Validators ============

export const createDepartmentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  nameLocal: z.string().max(200).optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code cannot exceed 10 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens'),
  facultyId: z.string().uuid('Invalid faculty ID'),
  hodId: z.string().uuid('Invalid HOD ID').optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  nameLocal: z.string().max(200).optional().nullable(),
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens')
    .optional(),
  facultyId: z.string().uuid('Invalid faculty ID').optional(),
  hodId: z.string().uuid('Invalid HOD ID').optional().nullable(),
});

export const departmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  facultyId: z.string().uuid().optional(),
});

export const departmentIdSchema = z.object({
  id: z.string().uuid('Invalid department ID'),
});

// ============ Program Validators ============

export const createProgramSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  nameLocal: z.string().max(200).optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens'),
  type: z.enum(['CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER'], {
    errorMap: () => ({ message: 'Invalid program type' }),
  }),
  durationYears: z.coerce.number().int().min(1, 'Duration must be at least 1 year').max(6, 'Duration cannot exceed 6 years'),
  totalCredits: z.coerce.number().int().min(1, 'Credits must be at least 1').max(300, 'Credits cannot exceed 300'),
  departmentId: z.string().uuid('Invalid department ID'),
});

export const updateProgramSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  nameLocal: z.string().max(200).optional().nullable(),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with optional hyphens')
    .optional(),
  type: z.enum(['CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER']).optional(),
  durationYears: z.coerce.number().int().min(1).max(6).optional(),
  totalCredits: z.coerce.number().int().min(1).max(300).optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
});

export const programQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  type: z.enum(['CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER']).optional(),
});

export const programIdSchema = z.object({
  id: z.string().uuid('Invalid program ID'),
});

// ============ Curriculum Validators ============

export const addCurriculumCourseSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  semester: z.coerce.number().int().min(1, 'Semester must be at least 1').max(12, 'Semester cannot exceed 12'),
  isRequired: z.boolean().default(true),
});

export const curriculumCourseIdSchema = z.object({
  id: z.string().uuid('Invalid program ID'),
  courseId: z.string().uuid('Invalid course ID'),
});

// ============ Course Validators ============

export const createCourseSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  nameLocal: z.string().max(200).optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code cannot exceed 20 characters')
    .regex(/^[A-Z]{2,4}\d{3,4}$/, 'Code must be in format like CS101 or MATH2001'),
  credits: z.coerce.number().int().min(1, 'Credits must be at least 1').max(10, 'Credits cannot exceed 10'),
  description: z.string().max(1000).optional(),
  departmentId: z.string().uuid('Invalid department ID'),
  prerequisiteIds: z.array(z.string().uuid()).optional(),
});

export const updateCourseSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  nameLocal: z.string().max(200).optional().nullable(),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z]{2,4}\d{3,4}$/, 'Code must be in format like CS101 or MATH2001')
    .optional(),
  credits: z.coerce.number().int().min(1).max(10).optional(),
  description: z.string().max(1000).optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
});

export const courseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
});

export const courseIdSchema = z.object({
  id: z.string().uuid('Invalid course ID'),
});

export const addPrerequisiteSchema = z.object({
  prerequisiteId: z.string().uuid('Invalid prerequisite course ID'),
});

export const prerequisiteIdSchema = z.object({
  id: z.string().uuid('Invalid course ID'),
  prereqId: z.string().uuid('Invalid prerequisite course ID'),
});

// ============ Type Exports ============

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;
export type SemesterQueryInput = z.infer<typeof semesterQuerySchema>;

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;
export type FacultyQueryInput = z.infer<typeof facultyQuerySchema>;

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentQueryInput = z.infer<typeof departmentQuerySchema>;

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ProgramQueryInput = z.infer<typeof programQuerySchema>;

export type AddCurriculumCourseInput = z.infer<typeof addCurriculumCourseSchema>;

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseQueryInput = z.infer<typeof courseQuerySchema>;
export type AddPrerequisiteInput = z.infer<typeof addPrerequisiteSchema>;
