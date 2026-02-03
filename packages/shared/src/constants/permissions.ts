export const RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  STUDENTS: 'students',
  EMPLOYEES: 'employees',
  COURSES: 'courses',
  CLASSES: 'classes',
  ENROLLMENTS: 'enrollments',
  GRADES: 'grades',
  ATTENDANCE: 'attendance',
  PAYMENTS: 'payments',
  FEES: 'fees',
  BOOKS: 'books',
  LOANS: 'loans',
  DEPARTMENTS: 'departments',
  FACULTIES: 'faculties',
  AUDIT: 'audit',
  SETTINGS: 'settings',
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

export type Permission = `${Resource}:${Action}`;

export const buildPermission = (resource: Resource, action: Action): Permission => {
  return `${resource}:${action}`;
};

// Common permission sets by role
export const ADMIN_PERMISSIONS: Permission[] = Object.values(RESOURCES).flatMap((resource) =>
  Object.values(ACTIONS).map((action) => buildPermission(resource, action))
);

export const STUDENT_PERMISSIONS: Permission[] = [
  buildPermission(RESOURCES.COURSES, ACTIONS.READ),
  buildPermission(RESOURCES.CLASSES, ACTIONS.READ),
  buildPermission(RESOURCES.ENROLLMENTS, ACTIONS.READ),
  buildPermission(RESOURCES.GRADES, ACTIONS.READ),
  buildPermission(RESOURCES.ATTENDANCE, ACTIONS.READ),
  buildPermission(RESOURCES.PAYMENTS, ACTIONS.READ),
  buildPermission(RESOURCES.FEES, ACTIONS.READ),
  buildPermission(RESOURCES.BOOKS, ACTIONS.READ),
  buildPermission(RESOURCES.LOANS, ACTIONS.READ),
];

export const INSTRUCTOR_PERMISSIONS: Permission[] = [
  buildPermission(RESOURCES.COURSES, ACTIONS.READ),
  buildPermission(RESOURCES.CLASSES, ACTIONS.READ),
  buildPermission(RESOURCES.CLASSES, ACTIONS.UPDATE),
  buildPermission(RESOURCES.ENROLLMENTS, ACTIONS.READ),
  buildPermission(RESOURCES.GRADES, ACTIONS.READ),
  buildPermission(RESOURCES.GRADES, ACTIONS.CREATE),
  buildPermission(RESOURCES.GRADES, ACTIONS.UPDATE),
  buildPermission(RESOURCES.ATTENDANCE, ACTIONS.READ),
  buildPermission(RESOURCES.ATTENDANCE, ACTIONS.CREATE),
  buildPermission(RESOURCES.ATTENDANCE, ACTIONS.UPDATE),
  buildPermission(RESOURCES.STUDENTS, ACTIONS.READ),
];
