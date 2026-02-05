/**
 * Comprehensive Grading System Test Script
 *
 * This script tests all grading functionality including:
 * 1. Grade scale creation and retrieval
 * 2. Grade component management
 * 3. Grade entry
 * 4. Grade calculation (final grades, GPA)
 * 5. Transcript generation
 * 6. Exam scheduling and conflict detection
 *
 * Run with: npx tsx src/scripts/test-grading.ts
 */

import { prisma } from '@hums/database';
import { gradeConfigService } from '../services/gradeConfig.service.js';
import { gradeComponentService } from '../services/gradeComponent.service.js';
import { gradeEntryService } from '../services/gradeEntry.service.js';
import { gradeCalculationService } from '../services/gradeCalculation.service.js';
import { examService } from '../services/exam.service.js';
import type { GradeComponentType, ExamType } from '@hums/database';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Helper to log with colors
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper to log section headers
function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'bold');
  console.log('='.repeat(60));
}

// Helper to log test results
function logTest(name: string, passed: boolean, details?: string) {
  const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`  [${status}] ${name}`);
  if (details) {
    console.log(`         ${colors.cyan}${details}${colors.reset}`);
  }
}

// Run a single test with error handling
async function runTest(name: string, testFn: () => Promise<void>): Promise<boolean> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    logTest(name, true, `(${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, error: errorMessage, duration });
    logTest(name, false, errorMessage);
    return false;
  }
}

// Test data storage for cleanup
interface TestData {
  userId?: string;
  employeeId?: string;
  facultyId?: string;
  departmentId?: string;
  programId?: string;
  courseId?: string;
  academicYearId?: string;
  semesterId?: string;
  classId?: string;
  roomId?: string;
  studentIds: string[];
  enrollmentIds: string[];
  gradeScaleId?: string;
  componentIds: string[];
  examIds: string[];
}

const testData: TestData = {
  studentIds: [],
  enrollmentIds: [],
  componentIds: [],
  examIds: [],
};

/**
 * Setup test data - creates necessary entities for grading tests
 */
async function setupTestData(): Promise<void> {
  logSection('Setting Up Test Data');

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email: `grading-test-admin-${Date.now()}@hums.edu`,
      username: `grading-admin-${Date.now()}`,
      passwordHash: '$2a$12$test.hash.for.testing',
      firstName: 'Grading',
      lastName: 'Admin',
      isActive: true,
    },
  });
  testData.userId = user.id;
  log(`  Created admin user: ${user.email}`, 'cyan');

  // Create faculty
  const faculty = await prisma.faculty.create({
    data: {
      name: 'Faculty of Computer Science',
      code: `FCS-${Date.now()}`,
    },
  });
  testData.facultyId = faculty.id;
  log(`  Created faculty: ${faculty.name}`, 'cyan');

  // Create department
  const department = await prisma.department.create({
    data: {
      name: 'Department of Software Engineering',
      code: `DSE-${Date.now()}`,
      facultyId: faculty.id,
    },
  });
  testData.departmentId = department.id;
  log(`  Created department: ${department.name}`, 'cyan');

  // Create employee (lecturer)
  const lecturerUser = await prisma.user.create({
    data: {
      email: `grading-test-lecturer-${Date.now()}@hums.edu`,
      username: `grading-lecturer-${Date.now()}`,
      passwordHash: '$2a$12$test.hash.for.testing',
      firstName: 'Test',
      lastName: 'Lecturer',
      isActive: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      employeeId: `EMP-${Date.now()}`,
      userId: lecturerUser.id,
      departmentId: department.id,
      position: 'Lecturer',
      employmentType: 'FULL_TIME',
      hireDate: new Date(),
      salary: 50000,
      status: 'ACTIVE',
    },
  });
  testData.employeeId = employee.id;
  log(`  Created lecturer: ${lecturerUser.firstName} ${lecturerUser.lastName}`, 'cyan');

  // Create program
  const program = await prisma.program.create({
    data: {
      name: 'Bachelor of Software Engineering',
      code: `BSE-${Date.now()}`,
      type: 'BACHELOR',
      durationYears: 4,
      totalCredits: 120,
      departmentId: department.id,
    },
  });
  testData.programId = program.id;
  log(`  Created program: ${program.name}`, 'cyan');

  // Create course
  const course = await prisma.course.create({
    data: {
      name: 'Data Structures and Algorithms',
      code: `CS201-${Date.now()}`,
      credits: 3,
      description: 'Introduction to data structures and algorithms',
      departmentId: department.id,
    },
  });
  testData.courseId = course.id;
  log(`  Created course: ${course.name}`, 'cyan');

  // Create academic year
  const academicYear = await prisma.academicYear.create({
    data: {
      name: `Test Year ${Date.now()}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
  });
  testData.academicYearId = academicYear.id;
  log(`  Created academic year: ${academicYear.name}`, 'cyan');

  // Create semester
  const semester = await prisma.semester.create({
    data: {
      name: 'Fall Semester Test',
      academicYearId: academicYear.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      registrationStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
  });
  testData.semesterId = semester.id;
  log(`  Created semester: ${semester.name}`, 'cyan');

  // Create room
  const room = await prisma.room.create({
    data: {
      name: `Test Room ${Date.now()}`,
      building: 'Main Building',
      capacity: 50,
      roomType: 'CLASSROOM',
      isActive: true,
    },
  });
  testData.roomId = room.id;
  log(`  Created room: ${room.name}`, 'cyan');

  // Create class
  const classEntity = await prisma.class.create({
    data: {
      name: `CS201-A-${Date.now()}`,
      courseId: course.id,
      semesterId: semester.id,
      lecturerId: employee.id,
      capacity: 40,
      roomId: room.id,
      status: 'OPEN',
    },
  });
  testData.classId = classEntity.id;
  log(`  Created class: ${classEntity.name}`, 'cyan');

  // Create test students and enrollments
  const studentNames = [
    { firstName: 'Ahmed', lastName: 'Mohamed' },
    { firstName: 'Fatima', lastName: 'Hassan' },
    { firstName: 'Omar', lastName: 'Ali' },
    { firstName: 'Amina', lastName: 'Ibrahim' },
    { firstName: 'Hassan', lastName: 'Abdi' },
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const studentUser = await prisma.user.create({
      data: {
        email: `grading-test-student-${i}-${Date.now()}@hums.edu`,
        username: `grading-student-${i}-${Date.now()}`,
        passwordHash: '$2a$12$test.hash.for.testing',
        firstName: studentNames[i].firstName,
        lastName: studentNames[i].lastName,
        isActive: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        studentId: `HU/${new Date().getFullYear()}/${1000 + i}-${Date.now()}`,
        userId: studentUser.id,
        programId: program.id,
        admissionDate: new Date(),
        status: 'ACTIVE',
        currentSemester: 3,
      },
    });
    testData.studentIds.push(student.id);

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classId: classEntity.id,
        semesterId: semester.id,
        status: 'REGISTERED',
      },
    });
    testData.enrollmentIds.push(enrollment.id);
  }

  log(`  Created ${studentNames.length} students with enrollments`, 'cyan');
  log('\n  Test data setup complete!', 'green');
}

/**
 * Cleanup test data
 */
async function cleanupTestData(): Promise<void> {
  logSection('Cleaning Up Test Data');

  try {
    // Delete all exams for the test class (including any created during failed tests)
    if (testData.classId) {
      const deleted = await prisma.exam.deleteMany({
        where: { classId: testData.classId },
      });
      if (deleted.count > 0) {
        log(`  Deleted ${deleted.count} exams`, 'cyan');
      }
    }

    // Delete grade entries
    if (testData.componentIds.length > 0) {
      await prisma.gradeEntry.deleteMany({
        where: { componentId: { in: testData.componentIds } },
      });
      log('  Deleted grade entries', 'cyan');
    }

    // Delete grade components
    if (testData.componentIds.length > 0) {
      await prisma.gradeComponent.deleteMany({
        where: { id: { in: testData.componentIds } },
      });
      log(`  Deleted ${testData.componentIds.length} grade components`, 'cyan');
    }

    // Delete grade scale (if created by test)
    if (testData.gradeScaleId) {
      // Check if it's not default before deleting
      const scale = await prisma.gradeScale.findUnique({
        where: { id: testData.gradeScaleId },
      });
      if (scale && !scale.isDefault) {
        await prisma.gradeDefinition.deleteMany({
          where: { scaleId: testData.gradeScaleId },
        });
        await prisma.gradeScale.delete({
          where: { id: testData.gradeScaleId },
        });
        log('  Deleted test grade scale', 'cyan');
      }
    }

    // Delete enrollments
    if (testData.enrollmentIds.length > 0) {
      await prisma.enrollment.deleteMany({
        where: { id: { in: testData.enrollmentIds } },
      });
      log(`  Deleted ${testData.enrollmentIds.length} enrollments`, 'cyan');
    }

    // Delete students and their users
    if (testData.studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: testData.studentIds } },
        select: { userId: true },
      });
      const studentUserIds = students.map((s) => s.userId);

      await prisma.student.deleteMany({
        where: { id: { in: testData.studentIds } },
      });

      await prisma.user.deleteMany({
        where: { id: { in: studentUserIds } },
      });
      log(`  Deleted ${testData.studentIds.length} students`, 'cyan');
    }

    // Delete class
    if (testData.classId) {
      await prisma.class.delete({
        where: { id: testData.classId },
      });
      log('  Deleted test class', 'cyan');
    }

    // Delete room
    if (testData.roomId) {
      await prisma.room.delete({
        where: { id: testData.roomId },
      });
      log('  Deleted test room', 'cyan');
    }

    // Delete semester
    if (testData.semesterId) {
      await prisma.semester.delete({
        where: { id: testData.semesterId },
      });
      log('  Deleted test semester', 'cyan');
    }

    // Delete academic year
    if (testData.academicYearId) {
      await prisma.academicYear.delete({
        where: { id: testData.academicYearId },
      });
      log('  Deleted test academic year', 'cyan');
    }

    // Delete course
    if (testData.courseId) {
      await prisma.course.delete({
        where: { id: testData.courseId },
      });
      log('  Deleted test course', 'cyan');
    }

    // Delete program
    if (testData.programId) {
      await prisma.program.delete({
        where: { id: testData.programId },
      });
      log('  Deleted test program', 'cyan');
    }

    // Delete employee and user
    if (testData.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: testData.employeeId },
        select: { userId: true },
      });

      await prisma.employee.delete({
        where: { id: testData.employeeId },
      });

      if (employee) {
        await prisma.user.delete({
          where: { id: employee.userId },
        });
      }
      log('  Deleted test lecturer', 'cyan');
    }

    // Delete department
    if (testData.departmentId) {
      await prisma.department.delete({
        where: { id: testData.departmentId },
      });
      log('  Deleted test department', 'cyan');
    }

    // Delete faculty
    if (testData.facultyId) {
      await prisma.faculty.delete({
        where: { id: testData.facultyId },
      });
      log('  Deleted test faculty', 'cyan');
    }

    // Delete admin user
    if (testData.userId) {
      // Delete audit logs first
      await prisma.auditLog.deleteMany({
        where: { userId: testData.userId },
      });
      await prisma.user.delete({
        where: { id: testData.userId },
      });
      log('  Deleted test admin user', 'cyan');
    }

    log('\n  Cleanup complete!', 'green');
  } catch (error) {
    log(`  Cleanup error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  }
}

/**
 * Test 1: Grade Scale Management
 */
async function testGradeScaleManagement(): Promise<void> {
  logSection('Test 1: Grade Scale Management');

  await runTest('Get or create default grade scale', async () => {
    const defaultScale = await gradeConfigService.getDefaultScale();

    if (!defaultScale) {
      throw new Error('Default scale should be returned or created');
    }
    if (!defaultScale.grades || defaultScale.grades.length === 0) {
      throw new Error('Default scale should have grade definitions');
    }

    log(`    Default scale: ${defaultScale.name} with ${defaultScale.grades.length} grades`, 'cyan');
  });

  await runTest('Verify default grade scale has correct structure', async () => {
    const scale = await gradeConfigService.getDefaultScale();

    // Check for A grade
    const gradeA = scale.grades.find((g) => g.letter === 'A');
    if (!gradeA) {
      throw new Error('Default scale should have grade A');
    }
    if (Number(gradeA.gradePoints) !== 4.0) {
      throw new Error('Grade A should have 4.0 grade points');
    }

    // Check for F grade
    const gradeF = scale.grades.find((g) => g.letter === 'F');
    if (!gradeF) {
      throw new Error('Default scale should have grade F');
    }
    if (Number(gradeF.gradePoints) !== 0.0) {
      throw new Error('Grade F should have 0.0 grade points');
    }
  });

  await runTest('Calculate letter grade from percentage', async () => {
    const testCases = [
      { percentage: 95, expectedLetter: 'A+' },
      { percentage: 90, expectedLetter: 'A' },
      { percentage: 85, expectedLetter: 'B+' },
      { percentage: 75, expectedLetter: 'C+' },
      { percentage: 55, expectedLetter: 'F' },
    ];

    for (const test of testCases) {
      const result = await gradeConfigService.calculateLetterGrade(test.percentage);
      if (result.letter !== test.expectedLetter) {
        throw new Error(
          `${test.percentage}% should be ${test.expectedLetter}, got ${result.letter}`
        );
      }
    }

    log('    All percentage-to-letter conversions correct', 'cyan');
  });
}

/**
 * Test 2: Grade Component Management
 */
async function testGradeComponentManagement(): Promise<void> {
  logSection('Test 2: Grade Component Management');

  const componentDefinitions: Array<{
    name: string;
    type: GradeComponentType;
    weight: number;
    maxScore: number;
  }> = [
    { name: 'Midterm Exam', type: 'MIDTERM', weight: 25, maxScore: 100 },
    { name: 'Final Exam', type: 'FINAL', weight: 35, maxScore: 100 },
    { name: 'Assignments', type: 'ASSIGNMENT', weight: 20, maxScore: 100 },
    { name: 'Quizzes', type: 'QUIZ', weight: 10, maxScore: 50 },
    { name: 'Participation', type: 'PARTICIPATION', weight: 10, maxScore: 20 },
  ];

  for (const def of componentDefinitions) {
    await runTest(`Create grade component: ${def.name} (${def.weight}%)`, async () => {
      const component = await gradeComponentService.createComponent(
        testData.classId!,
        {
          name: def.name,
          type: def.type,
          weight: def.weight,
          maxScore: def.maxScore,
        },
        testData.userId
      );

      if (!component.id) {
        throw new Error('Component should have an ID');
      }
      if (component.name !== def.name) {
        throw new Error(`Component name mismatch: expected ${def.name}, got ${component.name}`);
      }

      testData.componentIds.push(component.id);
    });
  }

  await runTest('Validate component weights sum to 100%', async () => {
    const validation = await gradeComponentService.validateWeights(testData.classId!);

    if (!validation.valid) {
      throw new Error(`Weights do not sum to 100%: total = ${validation.total}%`);
    }

    log(`    Total weight: ${validation.total}%`, 'cyan');
  });

  await runTest('Get all components for class', async () => {
    const components = await gradeComponentService.getClassComponents(testData.classId!);

    if (components.length !== componentDefinitions.length) {
      throw new Error(
        `Expected ${componentDefinitions.length} components, got ${components.length}`
      );
    }

    log(`    Retrieved ${components.length} components`, 'cyan');
  });

  await runTest('Reject component that exceeds 100% total', async () => {
    try {
      await gradeComponentService.createComponent(
        testData.classId!,
        {
          name: 'Extra Component',
          type: 'OTHER',
          weight: 10,
          maxScore: 100,
        },
        testData.userId
      );
      throw new Error('Should have rejected component exceeding 100%');
    } catch (error) {
      if (error instanceof Error && error.message.includes('exceed 100%')) {
        // Expected behavior
        return;
      }
      throw error;
    }
  });
}

/**
 * Test 3: Grade Entry
 */
async function testGradeEntry(): Promise<void> {
  logSection('Test 3: Grade Entry');

  // Sample grades for each student across components
  const studentGrades = [
    { studentIndex: 0, midterm: 88, final: 92, assignments: 95, quizzes: 45, participation: 18 },
    { studentIndex: 1, midterm: 75, final: 78, assignments: 82, quizzes: 35, participation: 16 },
    { studentIndex: 2, midterm: 92, final: 88, assignments: 90, quizzes: 48, participation: 20 },
    { studentIndex: 3, midterm: 65, final: 70, assignments: 75, quizzes: 30, participation: 14 },
    { studentIndex: 4, midterm: 55, final: 58, assignments: 60, quizzes: 25, participation: 12 },
  ];

  const componentNames = ['Midterm Exam', 'Final Exam', 'Assignments', 'Quizzes', 'Participation'];
  const gradeKeys: Array<keyof typeof studentGrades[0]> = [
    'midterm',
    'final',
    'assignments',
    'quizzes',
    'participation',
  ];

  // Get components
  const components = await gradeComponentService.getClassComponents(testData.classId!);

  for (let compIndex = 0; compIndex < componentNames.length; compIndex++) {
    const component = components.find((c) => c.name === componentNames[compIndex]);
    if (!component) continue;

    await runTest(`Enter grades for ${componentNames[compIndex]}`, async () => {
      const grades = studentGrades.map((sg) => ({
        enrollmentId: testData.enrollmentIds[sg.studentIndex],
        score: sg[gradeKeys[compIndex]] as number,
      }));

      const entries = await gradeEntryService.enterGrades(
        component.id,
        grades,
        testData.userId!
      );

      if (entries.length !== grades.length) {
        throw new Error(`Expected ${grades.length} entries, got ${entries.length}`);
      }

      log(`    Entered ${entries.length} grades`, 'cyan');
    });
  }

  await runTest('Get component grades with statistics', async () => {
    const midtermComponent = components.find((c) => c.name === 'Midterm Exam');
    if (!midtermComponent) throw new Error('Midterm component not found');

    const result = await gradeEntryService.getComponentGrades(midtermComponent.id);

    if (!result.statistics) {
      throw new Error('Statistics should be included');
    }
    if (result.entries.length !== 5) {
      throw new Error(`Expected 5 entries, got ${result.entries.length}`);
    }

    log(`    Midterm stats - Avg: ${result.statistics.average}, High: ${result.statistics.highest}, Low: ${result.statistics.lowest}`, 'cyan');
  });

  await runTest('Get grades for a specific student', async () => {
    const result = await gradeEntryService.getStudentGrades(testData.enrollmentIds[0]);

    if (result.entries.length !== 5) {
      throw new Error(`Expected 5 grade entries, got ${result.entries.length}`);
    }

    log(`    Student has ${result.entries.length} grade entries`, 'cyan');
  });
}

/**
 * Test 4: Grade Calculation
 */
async function testGradeCalculation(): Promise<void> {
  logSection('Test 4: Grade Calculation');

  await runTest('Calculate final grade for single student', async () => {
    const result = await gradeCalculationService.calculateFinalGrade(testData.enrollmentIds[0]);

    if (!result.letterGrade) {
      throw new Error('Letter grade should be calculated');
    }
    if (typeof result.totalPercentage !== 'number') {
      throw new Error('Total percentage should be a number');
    }
    if (typeof result.gradePoints !== 'number') {
      throw new Error('Grade points should be calculated');
    }

    log(`    Student 1: ${result.totalPercentage}% = ${result.letterGrade} (${result.gradePoints} points)`, 'cyan');
  });

  await runTest('Calculate final grades for entire class', async () => {
    const results = await gradeCalculationService.calculateClassGrades(testData.classId!);

    if (results.length !== 5) {
      throw new Error(`Expected 5 students, got ${results.length}`);
    }

    // Results should be sorted by percentage (descending)
    for (let i = 1; i < results.length; i++) {
      if (results[i].totalPercentage > results[i - 1].totalPercentage) {
        throw new Error('Results should be sorted by percentage descending');
      }
    }

    log('    Class grades (sorted by percentage):', 'cyan');
    results.forEach((r, i) => {
      log(`      ${i + 1}. ${r.studentName}: ${r.totalPercentage}% = ${r.letterGrade}`, 'cyan');
    });
  });

  await runTest('Finalize class grades', async () => {
    await gradeCalculationService.finalizeClassGrades(
      testData.classId!,
      testData.userId!
    );

    // Verify enrollments are updated
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: testData.classId },
    });

    const finalizedCount = enrollments.filter((e) => e.isFinalized).length;
    if (finalizedCount !== 5) {
      throw new Error(`Expected 5 finalized enrollments, got ${finalizedCount}`);
    }

    log(`    Finalized ${finalizedCount} student grades`, 'cyan');
  });

  await runTest('Get enrollment grades with current standing', async () => {
    const result = await gradeCalculationService.getEnrollmentGrades(testData.enrollmentIds[0]);

    if (!result.currentGrade) {
      throw new Error('Current grade should be calculated');
    }
    if (!result.enrollment.isFinalized) {
      throw new Error('Enrollment should be finalized');
    }

    log(`    Current grade: ${result.currentGrade.percentage}% (${result.currentGrade.letter})`, 'cyan');
  });
}

/**
 * Test 5: GPA Calculation
 */
async function testGPACalculation(): Promise<void> {
  logSection('Test 5: GPA Calculation');

  // First, complete the enrollments to make them eligible for GPA calculation
  await prisma.enrollment.updateMany({
    where: { id: { in: testData.enrollmentIds } },
    data: { status: 'COMPLETED' },
  });

  await runTest('Calculate semester GPA', async () => {
    // Get first student
    const student = await prisma.student.findUnique({
      where: { id: testData.studentIds[0] },
    });
    if (!student) throw new Error('Student not found');

    const gpa = await gradeCalculationService.calculateSemesterGPA(
      student.id,
      testData.semesterId!
    );

    if (typeof gpa !== 'number') {
      throw new Error('GPA should be a number');
    }
    if (gpa < 0 || gpa > 4.0) {
      throw new Error('GPA should be between 0 and 4.0');
    }

    log(`    Student 1 Semester GPA: ${gpa}`, 'cyan');
  });

  await runTest('Calculate cumulative GPA', async () => {
    const student = await prisma.student.findUnique({
      where: { id: testData.studentIds[0] },
    });
    if (!student) throw new Error('Student not found');

    const cgpa = await gradeCalculationService.calculateCGPA(student.id);

    if (typeof cgpa !== 'number') {
      throw new Error('CGPA should be a number');
    }

    log(`    Student 1 Cumulative GPA: ${cgpa}`, 'cyan');
  });

  await runTest('Get detailed GPA information', async () => {
    const student = await prisma.student.findUnique({
      where: { id: testData.studentIds[0] },
    });
    if (!student) throw new Error('Student not found');

    const result = await gradeCalculationService.getGPADetails(
      student.id,
      testData.semesterId
    );

    if (typeof result.cumulativeGPA !== 'number') {
      throw new Error('Cumulative GPA should be included');
    }
    if (typeof result.totalCredits !== 'number') {
      throw new Error('Total credits should be included');
    }

    log(`    CGPA: ${result.cumulativeGPA}, Total Credits: ${result.totalCredits}`, 'cyan');
  });
}

/**
 * Test 6: Transcript Generation
 */
async function testTranscriptGeneration(): Promise<void> {
  logSection('Test 6: Transcript Generation');

  await runTest('Generate unofficial transcript', async () => {
    const student = await prisma.student.findUnique({
      where: { id: testData.studentIds[0] },
    });
    if (!student) throw new Error('Student not found');

    const transcript = await gradeCalculationService.generateTranscript(student.id, false);

    if (!transcript.student) {
      throw new Error('Transcript should include student information');
    }
    if (!transcript.semesters || !Array.isArray(transcript.semesters)) {
      throw new Error('Transcript should include semesters');
    }
    if (transcript.isOfficial !== false) {
      throw new Error('Should be marked as unofficial');
    }

    log(`    Generated transcript for: ${transcript.student.name}`, 'cyan');
    log(`    Semesters: ${transcript.semesters.length}, CGPA: ${transcript.cumulativeGPA}`, 'cyan');
  });

  await runTest('Transcript includes correct semester data', async () => {
    const student = await prisma.student.findUnique({
      where: { id: testData.studentIds[0] },
    });
    if (!student) throw new Error('Student not found');

    const transcript = await gradeCalculationService.generateTranscript(student.id, false);

    if (transcript.semesters.length === 0) {
      throw new Error('Transcript should have at least one semester');
    }

    const semester = transcript.semesters[0];
    if (!semester.courses || semester.courses.length === 0) {
      throw new Error('Semester should have courses');
    }

    const course = semester.courses[0];
    if (!course.code || !course.name || !course.grade) {
      throw new Error('Course should have code, name, and grade');
    }

    log(`    Course: ${course.code} - ${course.name} = ${course.grade}`, 'cyan');
  });
}

/**
 * Test 7: Exam Scheduling
 */
async function testExamScheduling(): Promise<void> {
  logSection('Test 7: Exam Scheduling');

  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 30); // 30 days from now

  await runTest('Schedule midterm exam', async () => {
    const result = await examService.scheduleExam(
      {
        classId: testData.classId!,
        type: 'MIDTERM' as ExamType,
        title: 'Midterm Examination',
        date: examDate,
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        roomId: testData.roomId!,
        maxScore: 100,
        instructions: 'Bring your student ID. No electronic devices allowed.',
      },
      testData.userId
    );

    if (!result.exam) {
      throw new Error('Exam should be created');
    }
    if (result.exam.status !== 'SCHEDULED') {
      throw new Error('Exam status should be SCHEDULED');
    }

    testData.examIds.push(result.exam.id);
    log(`    Scheduled: ${result.exam.title} on ${examDate.toDateString()}`, 'cyan');
  });

  await runTest('Schedule final exam', async () => {
    const finalExamDate = new Date();
    finalExamDate.setDate(finalExamDate.getDate() + 60); // 60 days from now

    const result = await examService.scheduleExam(
      {
        classId: testData.classId!,
        type: 'FINAL' as ExamType,
        title: 'Final Examination',
        date: finalExamDate,
        startTime: '14:00',
        endTime: '17:00',
        duration: 180,
        roomId: testData.roomId!,
        maxScore: 100,
        instructions: 'Comprehensive exam covering all course material.',
      },
      testData.userId
    );

    if (!result.exam) {
      throw new Error('Exam should be created');
    }

    testData.examIds.push(result.exam.id);
    log(`    Scheduled: ${result.exam.title} on ${finalExamDate.toDateString()}`, 'cyan');
  });

  await runTest('Get class exams', async () => {
    const exams = await examService.getClassExams(testData.classId!);

    if (exams.length !== 2) {
      throw new Error(`Expected 2 exams, got ${exams.length}`);
    }

    log(`    Found ${exams.length} exams for class`, 'cyan');
  });

  await runTest('Get exam details', async () => {
    const exam = await examService.getExam(testData.examIds[0]);

    if (!exam.class) {
      throw new Error('Exam should include class details');
    }
    if (!exam.room) {
      throw new Error('Exam should include room details');
    }

    log(`    Exam: ${exam.title}, Room: ${exam.room.name}`, 'cyan');
  });
}

/**
 * Test 8: Conflict Detection
 */
async function testConflictDetection(): Promise<void> {
  logSection('Test 8: Conflict Detection');

  await runTest('Check room availability', async () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 30);

    // Room should not be available at same time as scheduled exam
    const isAvailable = await examService.checkRoomAvailability(
      testData.roomId!,
      examDate,
      '09:00',
      '11:00'
    );

    if (isAvailable) {
      throw new Error('Room should not be available at conflicting time');
    }

    log('    Correctly detected room conflict', 'cyan');
  });

  await runTest('Room available at different time', async () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 30);

    const isAvailable = await examService.checkRoomAvailability(
      testData.roomId!,
      examDate,
      '13:00',
      '15:00'
    );

    if (!isAvailable) {
      throw new Error('Room should be available at non-conflicting time');
    }

    log('    Correctly identified available slot', 'cyan');
  });

  await runTest('Check for student exam conflicts', async () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 30);

    const conflicts = await examService.checkConflicts(
      testData.classId!,
      examDate,
      '09:00',
      '11:00'
    );

    // Since all students are in the same class, there should be no conflict
    // (a conflict would be if students had another exam at same time)
    log(`    Found ${conflicts.length} potential conflicts`, 'cyan');
  });

  await runTest('Reject exam in unavailable room', async () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 30);

    try {
      await examService.scheduleExam(
        {
          classId: testData.classId!,
          type: 'QUIZ' as ExamType,
          title: 'Quiz',
          date: examDate,
          startTime: '09:30', // Overlaps with midterm
          endTime: '10:30',
          duration: 60,
          roomId: testData.roomId!,
          maxScore: 50,
        },
        testData.userId
      );
      throw new Error('Should have rejected due to room conflict');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        // Expected behavior
        return;
      }
      throw error;
    }
  });
}

/**
 * Print summary of all test results
 */
function printSummary(): void {
  logSection('Test Summary');

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n  Total Tests: ${testResults.length}`);
  log(`  Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`  Failed: ${failed}`, 'red');
  }
  console.log(`  Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    log('  Failed Tests:', 'red');
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`    - ${r.name}`);
        console.log(`      ${colors.yellow}Error: ${r.error}${colors.reset}`);
      });
  }

  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    log('  All tests passed!', 'green');
  } else {
    log(`  ${failed} test(s) failed`, 'red');
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('\n');
  log('='.repeat(60), 'bold');
  log('  HUMS V2 - Grading System Comprehensive Test Script', 'bold');
  log('='.repeat(60), 'bold');
  console.log('\n  This script tests all grading functionality including:');
  console.log('  - Grade scale management');
  console.log('  - Grade component creation and validation');
  console.log('  - Grade entry for students');
  console.log('  - Final grade calculation');
  console.log('  - GPA calculation (semester and cumulative)');
  console.log('  - Transcript generation');
  console.log('  - Exam scheduling');
  console.log('  - Conflict detection\n');

  try {
    // Setup
    await setupTestData();

    // Run all tests
    await testGradeScaleManagement();
    await testGradeComponentManagement();
    await testGradeEntry();
    await testGradeCalculation();
    await testGPACalculation();
    await testTranscriptGeneration();
    await testExamScheduling();
    await testConflictDetection();

    // Summary
    printSummary();
  } catch (error) {
    log('\n  Unexpected error during test execution:', 'red');
    console.error(error);
  } finally {
    // Cleanup
    await cleanupTestData();

    // Disconnect from database
    await prisma.$disconnect();

    // Exit with appropriate code
    const failedCount = testResults.filter((r) => !r.passed).length;
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

// Run the tests
main();
