export * from './roles';
export * from './permissions';

// Application constants
export const APP_NAME = 'HUMS';
export const APP_FULL_NAME = 'Hormuud University Management System';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Session constants
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Supported languages
export const LANGUAGES = {
  EN: 'en',
  SO: 'so',
} as const;

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const DEFAULT_LANGUAGE: Language = LANGUAGES.EN;

// Academic year / semester
export const SEMESTERS = {
  FALL: 'fall',
  SPRING: 'spring',
  SUMMER: 'summer',
} as const;

export type Semester = (typeof SEMESTERS)[keyof typeof SEMESTERS];

// Grade scales
export const GRADE_SCALE = {
  A_PLUS: { letter: 'A+', minScore: 97, maxScore: 100, gpa: 4.0 },
  A: { letter: 'A', minScore: 93, maxScore: 96, gpa: 4.0 },
  A_MINUS: { letter: 'A-', minScore: 90, maxScore: 92, gpa: 3.7 },
  B_PLUS: { letter: 'B+', minScore: 87, maxScore: 89, gpa: 3.3 },
  B: { letter: 'B', minScore: 83, maxScore: 86, gpa: 3.0 },
  B_MINUS: { letter: 'B-', minScore: 80, maxScore: 82, gpa: 2.7 },
  C_PLUS: { letter: 'C+', minScore: 77, maxScore: 79, gpa: 2.3 },
  C: { letter: 'C', minScore: 73, maxScore: 76, gpa: 2.0 },
  C_MINUS: { letter: 'C-', minScore: 70, maxScore: 72, gpa: 1.7 },
  D_PLUS: { letter: 'D+', minScore: 67, maxScore: 69, gpa: 1.3 },
  D: { letter: 'D', minScore: 63, maxScore: 66, gpa: 1.0 },
  D_MINUS: { letter: 'D-', minScore: 60, maxScore: 62, gpa: 0.7 },
  F: { letter: 'F', minScore: 0, maxScore: 59, gpa: 0.0 },
} as const;

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Attendance statuses
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];
