// Jest globals are available without import in test environment
import { prisma } from '@hums/database';
import bcrypt from 'bcryptjs';
import { CourseMaterialsService } from '../courseMaterials.service.js';

const courseMaterialsService = new CourseMaterialsService();
const SALT_ROUNDS = 12;

describe('Academic Portal Services', () => {
  let testUser: any;
  let testLecturer: any;
  let testFaculty: any;
  let testDepartment: any;
  let testProgram: any;
  let testCourse: any;
  let testAcademicYear: any;
  let testSemester: any;
  let testClass: any;
  let testMaterial: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.courseMaterial.deleteMany({
      where: { title: { startsWith: 'Test Material' } },
    });

    // Create test academic year
    testAcademicYear = await prisma.academicYear.create({
      data: {
        name: `Test Year AP ${Date.now()}`,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-08-31'),
        isCurrent: false,
      },
    });

    // Create test semester
    testSemester = await prisma.semester.create({
      data: {
        name: `Fall AP ${Date.now()}`,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-31'),
        academicYearId: testAcademicYear.id,
        isCurrent: false,
        registrationStart: new Date('2025-08-01'),
        registrationEnd: new Date('2025-08-31'),
      },
    });

    // Create test faculty
    testFaculty = await prisma.faculty.create({
      data: {
        name: `Test Faculty AP ${Date.now()}`,
        code: `TFAP${Date.now().toString().slice(-4)}`,
      },
    });

    // Create test department
    testDepartment = await prisma.department.create({
      data: {
        name: `Test Department AP ${Date.now()}`,
        code: `TDAP${Date.now().toString().slice(-4)}`,
        facultyId: testFaculty.id,
      },
    });

    // Create test program
    testProgram = await prisma.program.create({
      data: {
        name: `Test Program AP ${Date.now()}`,
        code: `TPAP${Date.now().toString().slice(-4)}`,
        departmentId: testDepartment.id,
        type: 'BACHELOR',
        durationYears: 4,
        totalCredits: 120,
      },
    });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        name: `Test Course AP ${Date.now()}`,
        code: `TCAP${Date.now().toString().slice(-4)}`,
        credits: 3,
        departmentId: testDepartment.id,
      },
    });

    // Create test user (lecturer)
    const timestamp = Date.now();
    const passwordHash = await bcrypt.hash('Test@123', SALT_ROUNDS);
    testUser = await prisma.user.create({
      data: {
        email: `lecturer.test.ap.${timestamp}@example.com`,
        username: `lec_ap_${timestamp}`,
        passwordHash,
        firstName: 'Test',
        lastName: 'Lecturer',
        isActive: true,
      },
    });

    // Create employee record for lecturer
    testLecturer = await prisma.employee.create({
      data: {
        userId: testUser.id,
        employeeId: `ELAP${Date.now().toString().slice(-6)}`,
        departmentId: testDepartment.id,
        position: 'Lecturer',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        hireDate: new Date(),
        salary: 5000,
      },
    });

    // Create test class
    testClass = await prisma.class.create({
      data: {
        name: `Test Class AP ${Date.now()}`,
        courseId: testCourse.id,
        semesterId: testSemester.id,
        lecturerId: testLecturer.id,
        capacity: 30,
        status: 'OPEN',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in reverse order of creation
    if (testMaterial) {
      await prisma.courseMaterial.delete({ where: { id: testMaterial.id } }).catch(() => {});
    }
    if (testClass) {
      await prisma.class.delete({ where: { id: testClass.id } }).catch(() => {});
    }
    if (testLecturer) {
      await prisma.employee.delete({ where: { id: testLecturer.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testCourse) {
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {});
    }
    if (testProgram) {
      await prisma.program.delete({ where: { id: testProgram.id } }).catch(() => {});
    }
    if (testDepartment) {
      await prisma.department.delete({ where: { id: testDepartment.id } }).catch(() => {});
    }
    if (testFaculty) {
      await prisma.faculty.delete({ where: { id: testFaculty.id } }).catch(() => {});
    }
    if (testSemester) {
      await prisma.semester.delete({ where: { id: testSemester.id } }).catch(() => {});
    }
    if (testAcademicYear) {
      await prisma.academicYear.delete({ where: { id: testAcademicYear.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe('CourseMaterialsService', () => {
    describe('createMaterial', () => {
      it('should create a new material', async () => {
        testMaterial = await courseMaterialsService.createMaterial({
          classId: testClass.id,
          title: 'Test Material - Week 1 Slides',
          description: 'Test description',
          type: 'SLIDES',
          externalUrl: 'https://example.com/slides',
          week: 1,
          isPublished: false,
        }, testUser.id);

        expect(testMaterial).toBeDefined();
        expect(testMaterial.id).toBeDefined();
        expect(testMaterial.title).toBe('Test Material - Week 1 Slides');
        expect(testMaterial.type).toBe('SLIDES');
        expect(testMaterial.isPublished).toBe(false);
      });
    });

    describe('getMaterials', () => {
      it('should return materials for a class', async () => {
        const materials = await courseMaterialsService.getMaterials(testClass.id, true);

        expect(materials).toBeDefined();
        expect(Array.isArray(materials)).toBe(true);
        expect(materials.length).toBeGreaterThanOrEqual(1);
      });

      it('should filter unpublished materials when includeUnpublished is false', async () => {
        const materials = await courseMaterialsService.getMaterials(testClass.id, false);

        expect(materials).toBeDefined();
        expect(Array.isArray(materials)).toBe(true);
        // All returned materials should be published
        materials.forEach((m: any) => {
          expect(m.isPublished).toBe(true);
        });
      });
    });

    describe('updateMaterial', () => {
      it('should update material properties', async () => {
        const updated = await courseMaterialsService.updateMaterial(testMaterial.id, {
          title: 'Test Material - Updated Title',
          description: 'Updated description',
        }, testUser.id);

        expect(updated).toBeDefined();
        expect(updated.title).toBe('Test Material - Updated Title');
        expect(updated.description).toBe('Updated description');
      });
    });

    describe('publishMaterial', () => {
      it('should publish a material', async () => {
        const published = await courseMaterialsService.publishMaterial(testMaterial.id, testUser.id);

        expect(published).toBeDefined();
        expect(published.isPublished).toBe(true);
        expect(published.publishedAt).toBeDefined();
      });
    });

    describe('unpublishMaterial', () => {
      it('should unpublish a material', async () => {
        const unpublished = await courseMaterialsService.unpublishMaterial(testMaterial.id, testUser.id);

        expect(unpublished).toBeDefined();
        expect(unpublished.isPublished).toBe(false);
      });
    });

    describe('getMaterialStats', () => {
      it('should return material statistics', async () => {
        const stats = await courseMaterialsService.getMaterialStats(testClass.id);

        expect(stats).toBeDefined();
        expect(typeof stats.total).toBe('number');
        expect(typeof stats.published).toBe('number');
        expect(stats.byType).toBeDefined();
      });
    });

    describe('deleteMaterial', () => {
      it('should delete a material', async () => {
        await courseMaterialsService.deleteMaterial(testMaterial.id, testUser.id);

        // Verify it's deleted
        const materials = await courseMaterialsService.getMaterials(testClass.id, true);
        const found = materials.find((m: any) => m.id === testMaterial.id);
        expect(found).toBeUndefined();

        // Clear testMaterial so cleanup doesn't try to delete it again
        testMaterial = null;
      });
    });
  });
});
