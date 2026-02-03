export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  FINANCE: 'finance',
  LIBRARIAN: 'librarian',
  REGISTRAR: 'registrar',
  HR: 'hr',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const ROLE_DISPLAY_NAMES: Record<SystemRole, string> = {
  [SYSTEM_ROLES.ADMIN]: 'Administrator',
  [SYSTEM_ROLES.STAFF]: 'Staff',
  [SYSTEM_ROLES.STUDENT]: 'Student',
  [SYSTEM_ROLES.INSTRUCTOR]: 'Instructor',
  [SYSTEM_ROLES.FINANCE]: 'Finance Officer',
  [SYSTEM_ROLES.LIBRARIAN]: 'Librarian',
  [SYSTEM_ROLES.REGISTRAR]: 'Registrar',
  [SYSTEM_ROLES.HR]: 'HR Manager',
};
