import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('Seeding database...\n');

  // ===========================================
  // Create Permissions
  // ===========================================
  const resources = [
    'users',
    'roles',
    'students',
    'employees',
    'courses',
    'classes',
    'enrollments',
    'grades',
    'attendance',
    'payments',
    'invoices',
    'payroll',
    'leave',
    'books',
    'borrowings',
    'faculties',
    'departments',
    'programs',
    'announcements',
    'audit',
    'reports',
    'settings',
  ];

  const actions = ['create', 'read', 'update', 'delete'];

  const permissions: Array<{
    name: string;
    displayName: string;
    resource: string;
    action: string;
  }> = [];

  for (const resource of resources) {
    for (const action of actions) {
      // Some resources don't need all actions
      if (resource === 'audit' && action !== 'read') continue;
      if (resource === 'reports' && action !== 'read') continue;

      permissions.push({
        name: `${resource}:${action}`,
        displayName: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        resource,
        action,
      });
    }
  }

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.info(`Created ${permissions.length} permissions`);

  // ===========================================
  // Create Roles
  // ===========================================
  const roles = [
    {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      isSystem: true,
    },
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Administrative access to manage users and settings',
      isSystem: true,
    },
    {
      name: 'DEAN',
      displayName: 'Dean',
      description: 'Faculty dean with academic oversight',
      isSystem: true,
    },
    {
      name: 'HOD',
      displayName: 'Head of Department',
      description: 'Department head with departmental management access',
      isSystem: true,
    },
    {
      name: 'LECTURER',
      displayName: 'Lecturer',
      description: 'Teaching staff with class and grade management',
      isSystem: true,
    },
    {
      name: 'STUDENT',
      displayName: 'Student',
      description: 'Enrolled student with access to academic portal',
      isSystem: true,
    },
    {
      name: 'HR_STAFF',
      displayName: 'HR Staff',
      description: 'Human resources staff with employee management access',
      isSystem: true,
    },
    {
      name: 'FINANCE_STAFF',
      displayName: 'Finance Staff',
      description: 'Finance department staff with payment and billing access',
      isSystem: true,
    },
    {
      name: 'LIBRARIAN',
      displayName: 'Librarian',
      description: 'Library staff with book and borrowing management',
      isSystem: true,
    },
  ];

  const createdRoles: Record<string, string> = {};

  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    createdRoles[role.name] = created.id;
  }

  console.info(`Created ${roles.length} roles`);

  // ===========================================
  // Assign Permissions to Roles
  // ===========================================
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // Super Admin gets all permissions
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles.SUPER_ADMIN,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles.SUPER_ADMIN,
        permissionId: perm.id,
      },
    });
  }

  // Admin permissions (most except some sensitive ones)
  const adminPermissions = allPermissions.filter(
    (p) => !['settings:delete', 'audit:delete'].includes(p.name)
  );
  for (const perm of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles.ADMIN,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles.ADMIN,
        permissionId: perm.id,
      },
    });
  }

  // Lecturer permissions
  const lecturerPerms = [
    'classes:read',
    'students:read',
    'grades:create',
    'grades:read',
    'grades:update',
    'attendance:create',
    'attendance:read',
    'attendance:update',
    'courses:read',
    'announcements:read',
  ];
  for (const permName of lecturerPerms) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles.LECTURER,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: createdRoles.LECTURER,
          permissionId: permId,
        },
      });
    }
  }

  // Student permissions
  const studentPerms = [
    'courses:read',
    'classes:read',
    'grades:read',
    'attendance:read',
    'invoices:read',
    'payments:read',
    'books:read',
    'borrowings:read',
    'announcements:read',
  ];
  for (const permName of studentPerms) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles.STUDENT,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: createdRoles.STUDENT,
          permissionId: permId,
        },
      });
    }
  }

  // HR Staff permissions
  const hrPerms = [
    'employees:create',
    'employees:read',
    'employees:update',
    'employees:delete',
    'leave:create',
    'leave:read',
    'leave:update',
    'leave:delete',
    'payroll:create',
    'payroll:read',
    'payroll:update',
    'attendance:read',
    'reports:read',
  ];
  for (const permName of hrPerms) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles.HR_STAFF,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: createdRoles.HR_STAFF,
          permissionId: permId,
        },
      });
    }
  }

  // Finance Staff permissions
  const financePerms = [
    'payments:create',
    'payments:read',
    'payments:update',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'students:read',
    'reports:read',
  ];
  for (const permName of financePerms) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles.FINANCE_STAFF,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: createdRoles.FINANCE_STAFF,
          permissionId: permId,
        },
      });
    }
  }

  // Librarian permissions
  const librarianPerms = [
    'books:create',
    'books:read',
    'books:update',
    'books:delete',
    'borrowings:create',
    'borrowings:read',
    'borrowings:update',
    'borrowings:delete',
    'students:read',
  ];
  for (const permName of librarianPerms) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles.LIBRARIAN,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: createdRoles.LIBRARIAN,
          permissionId: permId,
        },
      });
    }
  }

  console.info('Assigned permissions to roles');

  // ===========================================
  // Create Super Admin User
  // ===========================================
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hormuud.edu.so' },
    update: {},
    create: {
      email: 'admin@hormuud.edu.so',
      username: 'admin',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      emailVerified: true,
      isActive: true,
    },
  });

  // Assign SUPER_ADMIN role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: createdRoles.SUPER_ADMIN,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: createdRoles.SUPER_ADMIN,
    },
  });

  console.info('Created super admin user: admin@hormuud.edu.so (password: Admin123!)');

  // ===========================================
  // Create Sample Academic Structure
  // ===========================================

  // Create Faculty
  const faculty = await prisma.faculty.upsert({
    where: { code: 'FCS' },
    update: {},
    create: {
      name: 'Faculty of Computing and Information Sciences',
      nameLocal: 'Kulliyadda Kombuyuutarka iyo Sayniska Macluumaadka',
      code: 'FCS',
    },
  });

  console.info(`Created faculty: ${faculty.name}`);

  // Create Department
  const department = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      name: 'Department of Computer Science',
      nameLocal: 'Waaxda Sayniska Kombuyuutarka',
      code: 'CS',
      facultyId: faculty.id,
    },
  });

  console.info(`Created department: ${department.name}`);

  // Create Program
  const program = await prisma.program.upsert({
    where: { code: 'BSC-CS' },
    update: {},
    create: {
      name: 'Bachelor of Science in Computer Science',
      nameLocal: 'Shahaadada Sayniska ee Sayniska Kombuyuutarka',
      code: 'BSC-CS',
      type: 'BACHELOR',
      durationYears: 4,
      totalCredits: 132,
      departmentId: department.id,
    },
  });

  console.info(`Created program: ${program.name}`);

  // Create Sample Courses
  const courses = [
    {
      name: 'Introduction to Programming',
      nameLocal: 'Hordhac Barnaamijyada',
      code: 'CS101',
      credits: 3,
      description: 'Fundamentals of programming using Python',
    },
    {
      name: 'Data Structures and Algorithms',
      nameLocal: 'Qaab-dhismeedka Xogta iyo Algorithms',
      code: 'CS201',
      credits: 4,
      description: 'Study of data organization and algorithmic problem solving',
    },
    {
      name: 'Database Systems',
      nameLocal: 'Nidaamyada Database',
      code: 'CS301',
      credits: 3,
      description: 'Design and implementation of database systems',
    },
  ];

  for (const courseData of courses) {
    await prisma.course.upsert({
      where: { code: courseData.code },
      update: {},
      create: {
        ...courseData,
        departmentId: department.id,
      },
    });
  }

  console.info(`Created ${courses.length} sample courses`);

  // Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2025-2026' },
    update: {},
    create: {
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
    },
  });

  console.info(`Created academic year: ${academicYear.name}`);

  // Create Semesters
  const fallSemester = await prisma.semester.upsert({
    where: { id: 'fall-2025' },
    update: {},
    create: {
      id: 'fall-2025',
      name: 'Fall 2025',
      academicYearId: academicYear.id,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-20'),
      registrationStart: new Date('2025-08-15'),
      registrationEnd: new Date('2025-09-10'),
      isCurrent: true,
    },
  });

  await prisma.semester.upsert({
    where: { id: 'spring-2026' },
    update: {},
    create: {
      id: 'spring-2026',
      name: 'Spring 2026',
      academicYearId: academicYear.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-05-30'),
      registrationStart: new Date('2026-01-01'),
      registrationEnd: new Date('2026-01-20'),
      isCurrent: false,
    },
  });

  console.info('Created semesters: Fall 2025, Spring 2026');

  // Create Sample Rooms
  const rooms = [
    { name: 'Room 101', building: 'Main Building', capacity: 40, type: 'Lecture' },
    { name: 'Room 102', building: 'Main Building', capacity: 35, type: 'Lecture' },
    { name: 'Lab A', building: 'Science Block', capacity: 25, type: 'Lab', hasAV: true },
  ];

  for (const roomData of rooms) {
    await prisma.room.upsert({
      where: { name: roomData.name },
      update: {},
      create: roomData,
    });
  }

  console.info(`Created ${rooms.length} rooms`);

  // Create Book Categories
  const bookCategories = [
    { name: 'Computer Science', nameLocal: 'Sayniska Kombuyuutarka' },
    { name: 'Mathematics', nameLocal: 'Xisaabta' },
    { name: 'General Reference', nameLocal: 'Tixraac Guud' },
  ];

  for (const category of bookCategories) {
    await prisma.bookCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.info(`Created ${bookCategories.length} book categories`);

  // Create Fee Structure
  await prisma.feeStructure.upsert({
    where: {
      programId_academicYear: {
        programId: program.id,
        academicYear: '2025-2026',
      },
    },
    update: {},
    create: {
      programId: program.id,
      academicYear: '2025-2026',
      tuitionFee: 1200,
      registrationFee: 50,
      libraryFee: 25,
      labFee: 75,
    },
  });

  console.info('Created fee structure for BSC-CS 2025-2026');

  // Create System Config
  const systemConfigs = [
    {
      key: 'university_name',
      value: { en: 'Hormuud University', so: 'Jaamacadda Hormuud' },
      description: 'University name in English and Somali',
    },
    {
      key: 'academic_year_current',
      value: { year: '2025-2026' },
      description: 'Current academic year',
    },
    {
      key: 'grading_scale',
      value: {
        A: { min: 90, max: 100, gpa: 4.0 },
        B: { min: 80, max: 89, gpa: 3.0 },
        C: { min: 70, max: 79, gpa: 2.0 },
        D: { min: 60, max: 69, gpa: 1.0 },
        F: { min: 0, max: 59, gpa: 0.0 },
      },
      description: 'Grading scale configuration',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.info(`Created ${systemConfigs.length} system configurations`);

  console.info('\n========================================');
  console.info('Seeding completed successfully!');
  console.info('========================================');
  console.info('\nDefault Login:');
  console.info('  Email: admin@hormuud.edu.so');
  console.info('  Password: Admin123!');
  console.info('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
