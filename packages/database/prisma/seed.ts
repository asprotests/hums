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
      middleName: 'Admin',
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

  // Create Faculties
  const facultyComputing = await prisma.faculty.upsert({
    where: { code: 'FCS' },
    update: {},
    create: {
      name: 'Faculty of Computing and Information Sciences',
      nameLocal: 'Kulliyadda Kombuyuutarka iyo Sayniska Macluumaadka',
      code: 'FCS',
    },
  });

  const facultyBusiness = await prisma.faculty.upsert({
    where: { code: 'FB' },
    update: {},
    create: {
      name: 'Faculty of Business Administration',
      nameLocal: 'Kulliyadda Maamulka Ganacsi',
      code: 'FB',
    },
  });

  console.info(`Created 2 faculties: ${facultyComputing.name}, ${facultyBusiness.name}`);

  // Create Departments
  const deptCS = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      name: 'Department of Computer Science',
      nameLocal: 'Waaxda Sayniska Kombuyuutarka',
      code: 'CS',
      facultyId: facultyComputing.id,
    },
  });

  const deptIT = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      name: 'Department of Information Technology',
      nameLocal: 'Waaxda Tiknoolajiyada Macluumaadka',
      code: 'IT',
      facultyId: facultyComputing.id,
    },
  });

  const deptMgmt = await prisma.department.upsert({
    where: { code: 'MGMT' },
    update: {},
    create: {
      name: 'Department of Management',
      nameLocal: 'Waaxda Maamulka',
      code: 'MGMT',
      facultyId: facultyBusiness.id,
    },
  });

  console.info(`Created 3 departments: ${deptCS.name}, ${deptIT.name}, ${deptMgmt.name}`);

  // Create Programs
  const programBScCS = await prisma.program.upsert({
    where: { code: 'BSC-CS' },
    update: {},
    create: {
      name: 'Bachelor of Science in Computer Science',
      nameLocal: 'Shahaadada Sayniska ee Sayniska Kombuyuutarka',
      code: 'BSC-CS',
      type: 'BACHELOR',
      durationYears: 4,
      totalCredits: 132,
      departmentId: deptCS.id,
    },
  });

  const programBScIT = await prisma.program.upsert({
    where: { code: 'BSC-IT' },
    update: {},
    create: {
      name: 'Bachelor of Science in Information Technology',
      nameLocal: 'Shahaadada Sayniska ee Tiknoolajiyada Macluumaadka',
      code: 'BSC-IT',
      type: 'BACHELOR',
      durationYears: 4,
      totalCredits: 128,
      departmentId: deptIT.id,
    },
  });

  const programBBA = await prisma.program.upsert({
    where: { code: 'BBA' },
    update: {},
    create: {
      name: 'Bachelor of Business Administration',
      nameLocal: 'Shahaadada Maamulka Ganacsi',
      code: 'BBA',
      type: 'BACHELOR',
      durationYears: 4,
      totalCredits: 128,
      departmentId: deptMgmt.id,
    },
  });

  const programDipIT = await prisma.program.upsert({
    where: { code: 'DIP-IT' },
    update: {},
    create: {
      name: 'Diploma in Information Technology',
      nameLocal: 'Dibloomada Tiknoolajiyada Macluumaadka',
      code: 'DIP-IT',
      type: 'DIPLOMA',
      durationYears: 2,
      totalCredits: 72,
      departmentId: deptIT.id,
    },
  });

  console.info(`Created 4 programs: ${programBScCS.name}, ${programBScIT.name}, ${programBBA.name}, ${programDipIT.name}`);

  // Create Courses with Prerequisites
  const courseCS101 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: 'Introduction to Programming',
      nameLocal: 'Hordhac Barnaamijyada',
      code: 'CS101',
      credits: 3,
      description: 'Fundamentals of programming using Python',
      departmentId: deptCS.id,
    },
  });

  const courseCS102 = await prisma.course.upsert({
    where: { code: 'CS102' },
    update: {},
    create: {
      name: 'Object-Oriented Programming',
      nameLocal: 'Barnaamijyada OOP',
      code: 'CS102',
      credits: 3,
      description: 'Object-oriented programming concepts using Java',
      departmentId: deptCS.id,
    },
  });

  const courseCS201 = await prisma.course.upsert({
    where: { code: 'CS201' },
    update: {},
    create: {
      name: 'Data Structures and Algorithms',
      nameLocal: 'Qaab-dhismeedka Xogta iyo Algorithms',
      code: 'CS201',
      credits: 4,
      description: 'Study of data organization and algorithmic problem solving',
      departmentId: deptCS.id,
    },
  });

  const courseCS202 = await prisma.course.upsert({
    where: { code: 'CS202' },
    update: {},
    create: {
      name: 'Computer Architecture',
      nameLocal: 'Qaab-dhismeedka Kombuyuutarka',
      code: 'CS202',
      credits: 3,
      description: 'Computer organization and architecture fundamentals',
      departmentId: deptCS.id,
    },
  });

  const courseCS301 = await prisma.course.upsert({
    where: { code: 'CS301' },
    update: {},
    create: {
      name: 'Database Systems',
      nameLocal: 'Nidaamyada Database',
      code: 'CS301',
      credits: 3,
      description: 'Design and implementation of database systems',
      departmentId: deptCS.id,
    },
  });

  const courseCS302 = await prisma.course.upsert({
    where: { code: 'CS302' },
    update: {},
    create: {
      name: 'Software Engineering',
      nameLocal: 'Injineerinta Software',
      code: 'CS302',
      credits: 3,
      description: 'Software development lifecycle and methodologies',
      departmentId: deptCS.id,
    },
  });

  const courseCS401 = await prisma.course.upsert({
    where: { code: 'CS401' },
    update: {},
    create: {
      name: 'Advanced Database Systems',
      nameLocal: 'Nidaamyada Database ee Sare',
      code: 'CS401',
      credits: 3,
      description: 'Advanced topics in database systems including NoSQL',
      departmentId: deptCS.id,
    },
  });

  const courseIT101 = await prisma.course.upsert({
    where: { code: 'IT101' },
    update: {},
    create: {
      name: 'Introduction to Information Technology',
      nameLocal: 'Hordhaca IT',
      code: 'IT101',
      credits: 3,
      description: 'Overview of information technology concepts',
      departmentId: deptIT.id,
    },
  });

  const courseIT201 = await prisma.course.upsert({
    where: { code: 'IT201' },
    update: {},
    create: {
      name: 'Networking Fundamentals',
      nameLocal: 'Aasaaska Networking',
      code: 'IT201',
      credits: 3,
      description: 'Computer networking basics and protocols',
      departmentId: deptIT.id,
    },
  });

  await prisma.course.upsert({
    where: { code: 'MGMT101' },
    update: {},
    create: {
      name: 'Principles of Management',
      nameLocal: 'Mabaadii\'da Maamulka',
      code: 'MGMT101',
      credits: 3,
      description: 'Introduction to management principles and practices',
      departmentId: deptMgmt.id,
    },
  });

  console.info('Created 10 courses');

  // Create Course Prerequisites using the self-referential many-to-many relation
  // CS102 requires CS101
  await prisma.course.update({
    where: { id: courseCS102.id },
    data: { prerequisites: { connect: [{ id: courseCS101.id }] } },
  });

  // CS201 requires CS101
  await prisma.course.update({
    where: { id: courseCS201.id },
    data: { prerequisites: { connect: [{ id: courseCS101.id }] } },
  });

  // CS301 requires CS201
  await prisma.course.update({
    where: { id: courseCS301.id },
    data: { prerequisites: { connect: [{ id: courseCS201.id }] } },
  });

  // CS302 requires CS201 and CS102
  await prisma.course.update({
    where: { id: courseCS302.id },
    data: { prerequisites: { connect: [{ id: courseCS201.id }, { id: courseCS102.id }] } },
  });

  // CS401 requires CS301
  await prisma.course.update({
    where: { id: courseCS401.id },
    data: { prerequisites: { connect: [{ id: courseCS301.id }] } },
  });

  // IT201 requires IT101
  await prisma.course.update({
    where: { id: courseIT201.id },
    data: { prerequisites: { connect: [{ id: courseIT101.id }] } },
  });

  console.info('Created course prerequisites');

  // Create Curriculum for BSc CS Program
  const curriculumEntries = [
    { programId: programBScCS.id, courseId: courseCS101.id, semester: 1, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS102.id, semester: 2, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS201.id, semester: 3, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS202.id, semester: 3, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS301.id, semester: 5, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS302.id, semester: 5, isRequired: true },
    { programId: programBScCS.id, courseId: courseCS401.id, semester: 7, isRequired: false },
  ];

  for (const entry of curriculumEntries) {
    await prisma.curriculum.upsert({
      where: { programId_courseId: { programId: entry.programId, courseId: entry.courseId } },
      update: {},
      create: entry,
    });
  }

  console.info('Created curriculum for BSc CS program');

  // Keep reference to program for fee structure
  const program = programBScCS;

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
  await prisma.semester.upsert({
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
  const room101 = await prisma.room.upsert({
    where: { name: 'Room 101' },
    update: {},
    create: {
      name: 'Room 101',
      building: 'Main Building',
      capacity: 40,
      roomType: 'CLASSROOM',
    },
  });

  await prisma.room.upsert({
    where: { name: 'Room 102' },
    update: {},
    create: {
      name: 'Room 102',
      building: 'Main Building',
      capacity: 35,
      roomType: 'CLASSROOM',
    },
  });

  await prisma.room.upsert({
    where: { name: 'Lab A' },
    update: {},
    create: {
      name: 'Lab A',
      building: 'Science Block',
      capacity: 25,
      roomType: 'LAB',
    },
  });

  console.info('Created 3 rooms');

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

  // ===========================================
  // Create Test Lecturer
  // ===========================================
  const lecturerPassword = await bcrypt.hash('Lecturer123!', 12);
  const lecturerUser = await prisma.user.upsert({
    where: { email: 'lecturer@hormuud.edu.so' },
    update: {},
    create: {
      email: 'lecturer@hormuud.edu.so',
      username: 'lecturer1',
      passwordHash: lecturerPassword,
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: lecturerUser.id,
        roleId: createdRoles.LECTURER,
      },
    },
    update: {},
    create: {
      userId: lecturerUser.id,
      roleId: createdRoles.LECTURER,
    },
  });

  const lecturer = await prisma.employee.upsert({
    where: { employeeId: 'EMP001' },
    update: {},
    create: {
      employeeId: 'EMP001',
      userId: lecturerUser.id,
      departmentId: deptCS.id,
      position: 'Senior Lecturer',
      employmentType: 'FULL_TIME',
      hireDate: new Date('2020-01-15'),
      salary: 2500,
    },
  });

  console.info('Created test lecturer: lecturer@hormuud.edu.so (password: Lecturer123!)');

  // ===========================================
  // Create Test Students
  // ===========================================
  const studentPassword = await bcrypt.hash('Student123!', 12);

  // Student 1: Has completed CS101 (can register for CS201, CS102)
  const student1User = await prisma.user.upsert({
    where: { email: 'student1@hormuud.edu.so' },
    update: {},
    create: {
      email: 'student1@hormuud.edu.so',
      username: 'student1',
      passwordHash: studentPassword,
      firstName: 'Ali',
      lastName: 'Hassan',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student1User.id,
        roleId: createdRoles.STUDENT,
      },
    },
    update: {},
    create: {
      userId: student1User.id,
      roleId: createdRoles.STUDENT,
    },
  });

  const student1 = await prisma.student.upsert({
    where: { studentId: 'STU001' },
    update: {},
    create: {
      studentId: 'STU001',
      userId: student1User.id,
      programId: programBScCS.id,
      admissionDate: new Date('2024-09-01'),
      currentSemester: 3,
      status: 'ACTIVE',
    },
  });

  // Student 2: New student (has not completed any courses)
  const student2User = await prisma.user.upsert({
    where: { email: 'student2@hormuud.edu.so' },
    update: {},
    create: {
      email: 'student2@hormuud.edu.so',
      username: 'student2',
      passwordHash: studentPassword,
      firstName: 'Fatima',
      lastName: 'Abdi',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student2User.id,
        roleId: createdRoles.STUDENT,
      },
    },
    update: {},
    create: {
      userId: student2User.id,
      roleId: createdRoles.STUDENT,
    },
  });

  const student2 = await prisma.student.upsert({
    where: { studentId: 'STU002' },
    update: {},
    create: {
      studentId: 'STU002',
      userId: student2User.id,
      programId: programBScCS.id,
      admissionDate: new Date('2025-09-01'),
      currentSemester: 1,
      status: 'ACTIVE',
    },
  });

  // Student 3: Student with financial hold
  const student3User = await prisma.user.upsert({
    where: { email: 'student3@hormuud.edu.so' },
    update: {},
    create: {
      email: 'student3@hormuud.edu.so',
      username: 'student3',
      passwordHash: studentPassword,
      firstName: 'Omar',
      lastName: 'Yusuf',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student3User.id,
        roleId: createdRoles.STUDENT,
      },
    },
    update: {},
    create: {
      userId: student3User.id,
      roleId: createdRoles.STUDENT,
    },
  });

  const student3 = await prisma.student.upsert({
    where: { studentId: 'STU003' },
    update: {},
    create: {
      studentId: 'STU003',
      userId: student3User.id,
      programId: programBScCS.id,
      admissionDate: new Date('2024-09-01'),
      currentSemester: 2,
      status: 'ACTIVE',
    },
  });

  console.info('Created 3 test students: student1@hormuud.edu.so, student2@hormuud.edu.so, student3@hormuud.edu.so (password: Student123!)');

  // ===========================================
  // Create Classes for Fall 2025
  // ===========================================
  // Helper to find or create class
  const findOrCreateClass = async (data: {
    name: string;
    courseId: string;
    semesterId: string;
    lecturerId: string;
    capacity: number;
    status: 'OPEN' | 'CLOSED';
    roomId?: string;
  }) => {
    let cls = await prisma.class.findFirst({
      where: { name: data.name, semesterId: data.semesterId },
    });
    if (!cls) {
      cls = await prisma.class.create({ data });
    }
    return cls;
  };

  const classCS101A = await findOrCreateClass({
    name: 'CS101-A',
    courseId: courseCS101.id,
    semesterId: 'fall-2025',
    lecturerId: lecturer.id,
    capacity: 30,
    status: 'OPEN',
    roomId: room101?.id,
  });

  const classCS102A = await findOrCreateClass({
    name: 'CS102-A',
    courseId: courseCS102.id,
    semesterId: 'fall-2025',
    lecturerId: lecturer.id,
    capacity: 30,
    status: 'OPEN',
    roomId: room101?.id,
  });

  const classCS201A = await findOrCreateClass({
    name: 'CS201-A',
    courseId: courseCS201.id,
    semesterId: 'fall-2025',
    lecturerId: lecturer.id,
    capacity: 25,
    status: 'OPEN',
    roomId: room101?.id,
  });

  const classCS301A = await findOrCreateClass({
    name: 'CS301-A',
    courseId: courseCS301.id,
    semesterId: 'fall-2025',
    lecturerId: lecturer.id,
    capacity: 20,
    status: 'OPEN',
    roomId: room101?.id,
  });

  // Small capacity class for testing capacity enforcement
  const classIT101A = await findOrCreateClass({
    name: 'IT101-A',
    courseId: courseIT101.id,
    semesterId: 'fall-2025',
    lecturerId: lecturer.id,
    capacity: 2, // Small capacity for testing
    status: 'OPEN',
    roomId: room101?.id,
  });

  console.info('Created 5 classes for Fall 2025');

  // ===========================================
  // Create Class Schedules (for conflict testing)
  // ===========================================
  // Helper to find or create schedule
  const findOrCreateSchedule = async (data: {
    classId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    scheduleType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'EXAM';
    roomId?: string;
  }) => {
    let schedule = await prisma.schedule.findFirst({
      where: { classId: data.classId, dayOfWeek: data.dayOfWeek, startTime: data.startTime },
    });
    if (!schedule) {
      schedule = await prisma.schedule.create({ data });
    }
    return schedule;
  };

  await findOrCreateSchedule({
    classId: classCS101A.id,
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    scheduleType: 'LECTURE',
    roomId: room101?.id,
  });

  await findOrCreateSchedule({
    classId: classCS101A.id,
    dayOfWeek: 3, // Wednesday
    startTime: '09:00',
    endTime: '10:30',
    scheduleType: 'LECTURE',
    roomId: room101?.id,
  });

  // CS102 overlaps with CS101 on Monday (for conflict testing)
  await findOrCreateSchedule({
    classId: classCS102A.id,
    dayOfWeek: 1, // Monday - overlaps with CS101
    startTime: '10:00',
    endTime: '11:30',
    scheduleType: 'LECTURE',
    roomId: room101?.id,
  });

  await findOrCreateSchedule({
    classId: classCS201A.id,
    dayOfWeek: 2, // Tuesday
    startTime: '14:00',
    endTime: '15:30',
    scheduleType: 'LECTURE',
    roomId: room101?.id,
  });

  await findOrCreateSchedule({
    classId: classIT101A.id,
    dayOfWeek: 2, // Tuesday
    startTime: '14:00', // Same time as CS201 for conflict testing
    endTime: '15:30',
    scheduleType: 'LECTURE',
    roomId: room101?.id,
  });

  console.info('Created class schedules');

  // ===========================================
  // Create Registration Period for Fall 2025
  // ===========================================
  let regPeriod = await prisma.registrationPeriod.findFirst({
    where: { semesterId: 'fall-2025', type: 'REGULAR' },
  });
  if (!regPeriod) {
    regPeriod = await prisma.registrationPeriod.create({
      data: {
        semesterId: 'fall-2025',
        type: 'REGULAR',
        startDate: new Date('2025-08-15'),
        endDate: new Date('2027-12-31'), // Extended for testing
        isActive: true,
      },
    });
  }

  console.info('Created registration period for Fall 2025');

  // ===========================================
  // Create Student1's Completed Enrollment (CS101)
  // This allows Student1 to register for CS102 and CS201
  // ===========================================
  // Create a previous class for CS101 (previous semester)
  const prevClassCS101 = await findOrCreateClass({
    name: 'CS101-Prev',
    courseId: courseCS101.id,
    semesterId: 'fall-2025', // Using same semester for simplicity
    lecturerId: lecturer.id,
    capacity: 30,
    status: 'CLOSED',
  });

  let enrollment1 = await prisma.enrollment.findFirst({
    where: { studentId: student1.id, classId: prevClassCS101.id },
  });
  if (!enrollment1) {
    enrollment1 = await prisma.enrollment.create({
      data: {
        studentId: student1.id,
        classId: prevClassCS101.id,
        semesterId: 'fall-2025',
        status: 'COMPLETED', // Student1 completed CS101
      },
    });
  }

  console.info('Created completed CS101 enrollment for Student1');

  // ===========================================
  // Create Financial Hold for Student3
  // ===========================================
  let hold3 = await prisma.hold.findFirst({
    where: { studentId: student3.id, type: 'FINANCIAL', releasedAt: null },
  });
  if (!hold3) {
    hold3 = await prisma.hold.create({
      data: {
        studentId: student3.id,
        type: 'FINANCIAL',
        reason: 'Unpaid tuition fees for Fall 2024',
        placedById: adminUser.id,
        blocksRegistration: true,
        blocksGrades: false,
        blocksTranscript: true,
      },
    });
  }

  console.info('Created financial hold for Student3');

  console.info('\n========================================');
  console.info('Seeding completed successfully!');
  console.info('========================================');
  console.info('\nTest Accounts:');
  console.info('  Admin: admin@hormuud.edu.so / Admin123!');
  console.info('  Lecturer: lecturer@hormuud.edu.so / Lecturer123!');
  console.info('  Student1 (completed CS101): student1@hormuud.edu.so / Student123!');
  console.info('  Student2 (new student): student2@hormuud.edu.so / Student123!');
  console.info('  Student3 (has hold): student3@hormuud.edu.so / Student123!');
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
