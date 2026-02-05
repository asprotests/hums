import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import { gradeConfigService } from './gradeConfig.service.js';

export interface CalculatedGrade {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  componentScores: {
    componentId: string;
    componentName: string;
    score: number;
    maxScore: number;
    weight: number;
    weightedScore: number;
    percentage: number;
  }[];
  totalPercentage: number;
  letterGrade: string;
  gradePoints: number;
}

export interface GPAResult {
  semesterGPA: number;
  cumulativeGPA: number;
  totalCredits: number;
  totalPoints: number;
  semesterCredits: number;
  semesterPoints: number;
}

export interface TranscriptCourse {
  code: string;
  name: string;
  credits: number;
  grade: string;
  points: number;
}

export interface TranscriptSemester {
  id: string;
  name: string;
  courses: TranscriptCourse[];
  semesterCredits: number;
  semesterPoints: number;
  semesterGPA: number;
}

export interface TranscriptData {
  student: {
    id: string;
    studentId: string;
    name: string;
    program: string;
    admissionDate: Date;
  };
  semesters: TranscriptSemester[];
  cumulativeCredits: number;
  cumulativePoints: number;
  cumulativeGPA: number;
  generatedAt: Date;
  isOfficial: boolean;
}

export class GradeCalculationService {
  /**
   * Calculate final grade for a single enrollment
   */
  async calculateFinalGrade(enrollmentId: string): Promise<CalculatedGrade> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: {
          include: {
            gradeComponents: true,
            course: true,
          },
        },
        gradeEntries: {
          include: { component: true },
        },
      },
    });

    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }

    const components = enrollment.class.gradeComponents;
    const entries = enrollment.gradeEntries;

    // Calculate weighted score for each component
    const componentScores = components.map((component) => {
      const entry = entries.find((e) => e.componentId === component.id);
      const score = entry ? Number(entry.score) : 0;
      const maxScore = Number(component.maxScore);
      const weight = Number(component.weight);
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const weightedScore = (percentage * weight) / 100;

      return {
        componentId: component.id,
        componentName: component.name,
        score,
        maxScore,
        weight,
        weightedScore,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    // Calculate total percentage
    const totalPercentage = Math.round(
      componentScores.reduce((sum, c) => sum + c.weightedScore, 0) * 100
    ) / 100;

    // Get letter grade and grade points
    const gradeResult = await gradeConfigService.calculateLetterGrade(totalPercentage);

    return {
      enrollmentId,
      studentId: enrollment.student.id,
      studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      componentScores,
      totalPercentage,
      letterGrade: gradeResult.letter,
      gradePoints: gradeResult.gradePoints,
    };
  }

  /**
   * Calculate final grades for all students in a class
   */
  async calculateClassGrades(classId: string): Promise<CalculatedGrade[]> {
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: 'REGISTERED' },
          include: {
            student: true,
          },
        },
      },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    const grades: CalculatedGrade[] = [];

    for (const enrollment of classEntity.enrollments) {
      try {
        const grade = await this.calculateFinalGrade(enrollment.id);
        grades.push(grade);
      } catch (error) {
        // Continue with other students if one fails
        console.error(`Failed to calculate grade for enrollment ${enrollment.id}:`, error);
      }
    }

    return grades.sort((a, b) => b.totalPercentage - a.totalPercentage);
  }

  /**
   * Finalize grades for a class
   */
  async finalizeClassGrades(classId: string, userId: string) {
    // Calculate and save final grades for all students
    const grades = await this.calculateClassGrades(classId);

    for (const grade of grades) {
      await prisma.enrollment.update({
        where: { id: grade.enrollmentId },
        data: {
          finalPercentage: grade.totalPercentage,
          finalGrade: grade.letterGrade,
          gradePoints: grade.gradePoints,
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedById: userId,
        },
      });
    }

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'Class',
      resourceId: classId,
      userId,
      newValues: { action: 'finalize_grades', studentsCount: grades.length },
    });

    return grades;
  }

  /**
   * Unfinalize grades for a class (admin only)
   */
  async unfinalizeClassGrades(classId: string, reason: string, userId: string) {
    await prisma.enrollment.updateMany({
      where: { classId },
      data: {
        isFinalized: false,
        finalizedAt: null,
        finalizedById: null,
      },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'Class',
      resourceId: classId,
      userId,
      newValues: { action: 'unfinalize_grades', reason },
    });
  }

  /**
   * Calculate semester GPA for a student
   */
  async calculateSemesterGPA(studentId: string, semesterId: string): Promise<number> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        semesterId,
        status: { in: ['COMPLETED', 'REGISTERED'] },
        finalGrade: { not: null },
      },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    if (enrollments.length === 0) {
      return 0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const enrollment of enrollments) {
      const credits = enrollment.class.course.credits;
      const gradePoints = Number(enrollment.gradePoints) || 0;

      totalPoints += credits * gradePoints;
      totalCredits += credits;
    }

    return totalCredits > 0
      ? Math.round((totalPoints / totalCredits) * 100) / 100
      : 0;
  }

  /**
   * Calculate cumulative GPA for a student
   */
  async calculateCGPA(studentId: string): Promise<number> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['COMPLETED'] },
        finalGrade: { not: null },
      },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    if (enrollments.length === 0) {
      return 0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const enrollment of enrollments) {
      const credits = enrollment.class.course.credits;
      const gradePoints = Number(enrollment.gradePoints) || 0;

      totalPoints += credits * gradePoints;
      totalCredits += credits;
    }

    return totalCredits > 0
      ? Math.round((totalPoints / totalCredits) * 100) / 100
      : 0;
  }

  /**
   * Get detailed GPA information
   */
  async getGPADetails(studentId: string, semesterId?: string): Promise<GPAResult> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Get all completed enrollments
    const allEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'COMPLETED',
        finalGrade: { not: null },
      },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    // Calculate cumulative
    let totalPoints = 0;
    let totalCredits = 0;

    for (const enrollment of allEnrollments) {
      const credits = enrollment.class.course.credits;
      const gradePoints = Number(enrollment.gradePoints) || 0;

      totalPoints += credits * gradePoints;
      totalCredits += credits;
    }

    // Calculate semester (if provided)
    let semesterPoints = 0;
    let semesterCredits = 0;

    if (semesterId) {
      const semesterEnrollments = allEnrollments.filter(
        (e) => e.semesterId === semesterId
      );

      for (const enrollment of semesterEnrollments) {
        const credits = enrollment.class.course.credits;
        const gradePoints = Number(enrollment.gradePoints) || 0;

        semesterPoints += credits * gradePoints;
        semesterCredits += credits;
      }
    }

    return {
      cumulativeGPA: totalCredits > 0
        ? Math.round((totalPoints / totalCredits) * 100) / 100
        : 0,
      semesterGPA: semesterCredits > 0
        ? Math.round((semesterPoints / semesterCredits) * 100) / 100
        : 0,
      totalCredits,
      totalPoints: Math.round(totalPoints * 100) / 100,
      semesterCredits,
      semesterPoints: Math.round(semesterPoints * 100) / 100,
    };
  }

  /**
   * Generate transcript for a student
   */
  async generateTranscript(studentId: string, official: boolean = false): Promise<TranscriptData> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, middleName: true, lastName: true } },
        program: {
          include: { department: { include: { faculty: true } } },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Check for holds blocking transcript
    if (official) {
      const transcriptHolds = await prisma.hold.findMany({
        where: {
          studentId,
          releasedAt: null,
          blocksTranscript: true,
        },
      });

      if (transcriptHolds.length > 0) {
        throw AppError.badRequest('Student has holds blocking transcript generation');
      }
    }

    // Get all completed enrollments grouped by semester
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'COMPLETED',
        finalGrade: { not: null },
      },
      include: {
        semester: {
          include: { academicYear: true },
        },
        class: {
          include: { course: true },
        },
      },
      orderBy: [
        { semester: { startDate: 'asc' } },
        { class: { course: { code: 'asc' } } },
      ],
    });

    // Group by semester
    const semesterMap = new Map<string, TranscriptSemester>();

    for (const enrollment of enrollments) {
      const semesterId = enrollment.semesterId;

      if (!semesterMap.has(semesterId)) {
        semesterMap.set(semesterId, {
          id: semesterId,
          name: enrollment.semester.name,
          courses: [],
          semesterCredits: 0,
          semesterPoints: 0,
          semesterGPA: 0,
        });
      }

      const semester = semesterMap.get(semesterId)!;
      const credits = enrollment.class.course.credits;
      const gradePoints = Number(enrollment.gradePoints) || 0;
      const points = credits * gradePoints;

      semester.courses.push({
        code: enrollment.class.course.code,
        name: enrollment.class.course.name,
        credits,
        grade: enrollment.finalGrade!,
        points,
      });

      semester.semesterCredits += credits;
      semester.semesterPoints += points;
    }

    // Calculate semester GPAs
    for (const semester of semesterMap.values()) {
      semester.semesterGPA = semester.semesterCredits > 0
        ? Math.round((semester.semesterPoints / semester.semesterCredits) * 100) / 100
        : 0;
    }

    const semesters = Array.from(semesterMap.values());

    // Calculate cumulative
    const cumulativeCredits = semesters.reduce((sum, s) => sum + s.semesterCredits, 0);
    const cumulativePoints = semesters.reduce((sum, s) => sum + s.semesterPoints, 0);
    const cumulativeGPA = cumulativeCredits > 0
      ? Math.round((cumulativePoints / cumulativeCredits) * 100) / 100
      : 0;

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: [
          student.user.firstName,
          student.user.middleName,
          student.user.lastName,
        ]
          .filter(Boolean)
          .join(' '),
        program: `${student.program.name} - ${student.program.department.name}`,
        admissionDate: student.admissionDate,
      },
      semesters,
      cumulativeCredits,
      cumulativePoints: Math.round(cumulativePoints * 100) / 100,
      cumulativeGPA,
      generatedAt: new Date(),
      isOfficial: official,
    };
  }

  /**
   * Get grades for a specific enrollment
   */
  async getEnrollmentGrades(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: {
          include: {
            course: true,
            gradeComponents: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        gradeEntries: {
          include: { component: true },
        },
      },
    });

    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }

    // Calculate current grade
    const calculated = await this.calculateFinalGrade(enrollmentId);

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        isFinalized: enrollment.isFinalized,
        finalGrade: enrollment.finalGrade,
        finalPercentage: enrollment.finalPercentage
          ? Number(enrollment.finalPercentage)
          : null,
      },
      student: {
        id: enrollment.student.id,
        studentId: enrollment.student.studentId,
        name: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name,
        course: enrollment.class.course,
      },
      components: calculated.componentScores,
      currentGrade: {
        percentage: calculated.totalPercentage,
        letter: calculated.letterGrade,
        points: calculated.gradePoints,
      },
    };
  }
}

export const gradeCalculationService = new GradeCalculationService();
