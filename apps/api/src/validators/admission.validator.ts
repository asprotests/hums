import { z } from 'zod';

// Phone validation for Somali format
const somaliPhoneRegex = /^(\+252|252|0)?[1-9]\d{8}$/;

// ============ Admission Application Validators ============

export const createApplicationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  firstNameLocal: z.string().max(100).optional(),
  lastNameLocal: z.string().max(100).optional(),
  dateOfBirth: z.coerce.date().refine((date) => {
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 16;
  }, 'Applicant must be at least 16 years old'),
  gender: z.enum(['MALE', 'FEMALE'], { errorMap: () => ({ message: 'Gender must be MALE or FEMALE' }) }),
  phone: z.string().regex(somaliPhoneRegex, 'Invalid Somali phone number format (+252...)'),
  email: z.string().email('Invalid email address'),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  nationality: z.string().max(100).default('Somali'),

  // Emergency Contact
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().regex(somaliPhoneRegex, 'Invalid phone format').optional().or(z.literal('')),
  emergencyContactRelation: z.string().max(100).optional(),

  // Academic Information
  previousEducationLevel: z.enum(['secondary', 'diploma', 'bachelor', 'master'], {
    errorMap: () => ({ message: 'Invalid education level' }),
  }),
  previousSchoolName: z.string().max(200).optional(),
  graduationYear: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
  programId: z.string().uuid('Invalid program ID'),
});

export const updateApplicationSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(2).max(100).optional(),
  firstNameLocal: z.string().max(100).optional().nullable(),
  lastNameLocal: z.string().max(100).optional().nullable(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  phone: z.string().regex(somaliPhoneRegex, 'Invalid phone format').optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  nationality: z.string().max(100).optional(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().max(100).optional().nullable(),
  previousEducationLevel: z.enum(['secondary', 'diploma', 'bachelor', 'master']).optional(),
  previousSchoolName: z.string().max(200).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional().nullable(),
  programId: z.string().uuid().optional(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Invalid review status' }),
  }),
  remarks: z.string().max(1000).optional(),
});

export const rejectApplicationSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000),
});

export const applicationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED']).optional(),
  programId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const applicationIdSchema = z.object({
  id: z.string().uuid('Invalid application ID'),
});

// ============ Student Validators ============

export const studentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN']).optional(),
  programId: z.string().uuid().optional(),
  facultyId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const updateStudentSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  emergencyContactPhone: z.string().optional(),
  currentSemester: z.coerce.number().int().min(1).max(12).optional(),
});

export const studentIdSchema = z.object({
  id: z.string().uuid('Invalid student ID'),
});

export const transferStudentSchema = z.object({
  newProgramId: z.string().uuid('Invalid program ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const deactivateStudentSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  status: z.enum(['SUSPENDED', 'WITHDRAWN']).default('SUSPENDED'),
});

// ============ Document Validators ============

export const uploadDocumentSchema = z.object({
  type: z.enum(['ID_CARD', 'PASSPORT', 'CERTIFICATE', 'PHOTO', 'TRANSCRIPT', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
});

// ============ Type Exports ============

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;

export type StudentQueryInput = z.infer<typeof studentQuerySchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type TransferStudentInput = z.infer<typeof transferStudentSchema>;
export type DeactivateStudentInput = z.infer<typeof deactivateStudentSchema>;

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
