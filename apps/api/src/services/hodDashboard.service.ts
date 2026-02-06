import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';

export interface DepartmentOverview {
  id: string;
  name: string;
  code: string;
  facultyName: string;
}

export interface ClassOverview {
  id: string;
  name: string;
  courseCode: string;
  courseName: string;
  lecturerName: string;
  lecturerId: string;
  enrolledCount: number;
  capacity: number;
  attendanceRate: number;
  gradingProgress: number;
  roomName: string | null;
  status: string;
}

export interface FacultyWorkload {
  lecturerId: string;
  lecturerName: string;
  email: string;
  classCount: number;
  totalStudents: number;
  averageAttendance: number;
  gradingProgress: number;
}

export interface AttendanceAlert {
  classId: string;
  className: string;
  courseName: string;
  lecturerName: string;
  attendanceRate: number;
  alertType: 'LOW_ATTENDANCE' | 'MISSING_ATTENDANCE';
  description: string;
}

export interface GradingProgressReport {
  classId: string;
  className: string;
  courseName: string;
  lecturerName: string;
  components: {
    name: string;
    type: string;
    progress: number;
    dueDate: Date | null;
    isOverdue: boolean;
  }[];
  overallProgress: number;
}

export interface HODDashboard {
  department: DepartmentOverview;
  currentSemester: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  facultyCount: number;
  courseCount: number;
  studentCount: number;
  classCount: number;
  classesOverview: ClassOverview[];
  facultyWorkload: FacultyWorkload[];
  attendanceAlerts: AttendanceAlert[];
  gradingProgress: GradingProgressReport[];
}

export interface DeanDashboard {
  faculty: {
    id: string;
    name: string;
    code: string;
  };
  currentSemester: {
    id: string;
    name: string;
  };
  departments: {
    id: string;
    name: string;
    code: string;
    hodName: string | null;
    facultyCount: number;
    studentCount: number;
    classCount: number;
    averageAttendance: number;
  }[];
  overallStats: {
    totalDepartments: number;
    totalFaculty: number;
    totalStudents: number;
    totalClasses: number;
    averageAttendance: number;
  };
  alerts: {
    type: string;
    departmentName: string;
    description: string;
  }[];
}

export class HODDashboardService {
  /**
   * Get HOD dashboard data
   */
  async getHODDashboard(userId: string, semesterId?: string): Promise<HODDashboard> {
    // Get the HOD's department
    const employee = await prisma.employee.findFirst({
      where: { userId },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
      },
    });

    if (!employee || !employee.department) {
      throw AppError.notFound('Department not found for this user');
    }

    const department = employee.department;

    // Get current or specified semester
    let semester;
    if (semesterId) {
      semester = await prisma.semester.findUnique({
        where: { id: semesterId },
      });
    } else {
      semester = await prisma.semester.findFirst({
        where: { isCurrent: true },
      });
    }

    if (!semester) {
      throw AppError.notFound('No active semester found');
    }

    // Get faculty count
    const facultyCount = await prisma.employee.count({
      where: {
        departmentId: department.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Get course count
    const courseCount = await prisma.course.count({
      where: {
        departmentId: department.id,
        deletedAt: null,
      },
    });

    // Get student count (enrolled in department's classes)
    const studentCount = await prisma.enrollment.count({
      where: {
        class: {
          course: { departmentId: department.id },
          semesterId: semester.id,
        },
        status: 'REGISTERED',
      },
      // Using distinct to count unique students
    });

    // Get class count
    const classCount = await prisma.class.count({
      where: {
        course: { departmentId: department.id },
        semesterId: semester.id,
        deletedAt: null,
      },
    });

    // Get classes overview
    const classesOverview = await this.getDepartmentClasses(department.id, semester.id);

    // Get faculty workload
    const facultyWorkload = await this.getFacultyWorkload(department.id, semester.id);

    // Get attendance alerts
    const attendanceAlerts = await this.getAttendanceAlerts(department.id, semester.id);

    // Get grading progress
    const gradingProgress = await this.getGradingProgress(department.id, semester.id);

    return {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        facultyName: department.faculty.name,
      },
      currentSemester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
      },
      facultyCount,
      courseCount,
      studentCount,
      classCount,
      classesOverview,
      facultyWorkload,
      attendanceAlerts,
      gradingProgress,
    };
  }

  /**
   * Get all classes for a department
   */
  async getDepartmentClasses(departmentId: string, semesterId: string): Promise<ClassOverview[]> {
    const classes = await prisma.class.findMany({
      where: {
        course: { departmentId },
        semesterId,
        deletedAt: null,
      },
      include: {
        course: true,
        lecturer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: true,
        enrollments: {
          where: { status: 'REGISTERED' },
        },
        attendances: true,
        gradeComponents: {
          include: { entries: true },
        },
      },
    });

    return classes.map((cls) => {
      // Calculate attendance rate
      const totalAttendances = cls.attendances.length;
      const presentAttendances = cls.attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attendanceRate =
        totalAttendances > 0 ? (presentAttendances / totalAttendances) * 100 : 0;

      // Calculate grading progress
      let totalGradeSlots = 0;
      let filledGradeSlots = 0;
      for (const component of cls.gradeComponents) {
        totalGradeSlots += cls.enrollments.length;
        filledGradeSlots += component.entries.length;
      }
      const gradingProgress =
        totalGradeSlots > 0 ? (filledGradeSlots / totalGradeSlots) * 100 : 0;

      return {
        id: cls.id,
        name: cls.name,
        courseCode: cls.course.code,
        courseName: cls.course.name,
        lecturerName: `${cls.lecturer.user.firstName} ${cls.lecturer.user.lastName}`,
        lecturerId: cls.lecturerId,
        enrolledCount: cls.enrollments.length,
        capacity: cls.capacity,
        attendanceRate: Math.round(attendanceRate),
        gradingProgress: Math.round(gradingProgress),
        roomName: cls.room?.name || null,
        status: cls.status,
      };
    });
  }

  /**
   * Get faculty workload for a department
   */
  async getFacultyWorkload(departmentId: string, semesterId: string): Promise<FacultyWorkload[]> {
    const employees = await prisma.employee.findMany({
      where: {
        departmentId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        classes: {
          where: {
            semesterId,
            deletedAt: null,
          },
          include: {
            enrollments: {
              where: { status: 'REGISTERED' },
            },
            attendances: true,
            gradeComponents: {
              include: { entries: true },
            },
          },
        },
      },
    });

    return employees.map((emp) => {
      let totalStudents = 0;
      let totalAttendances = 0;
      let presentAttendances = 0;
      let totalGradeSlots = 0;
      let filledGradeSlots = 0;

      for (const cls of emp.classes) {
        totalStudents += cls.enrollments.length;
        totalAttendances += cls.attendances.length;
        presentAttendances += cls.attendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;

        for (const component of cls.gradeComponents) {
          totalGradeSlots += cls.enrollments.length;
          filledGradeSlots += component.entries.length;
        }
      }

      const averageAttendance =
        totalAttendances > 0 ? (presentAttendances / totalAttendances) * 100 : 0;
      const gradingProgress =
        totalGradeSlots > 0 ? (filledGradeSlots / totalGradeSlots) * 100 : 0;

      return {
        lecturerId: emp.id,
        lecturerName: `${emp.user.firstName} ${emp.user.lastName}`,
        email: emp.user.email,
        classCount: emp.classes.length,
        totalStudents,
        averageAttendance: Math.round(averageAttendance),
        gradingProgress: Math.round(gradingProgress),
      };
    });
  }

  /**
   * Get attendance alerts for a department
   */
  async getAttendanceAlerts(
    departmentId: string,
    semesterId: string
  ): Promise<AttendanceAlert[]> {
    const alerts: AttendanceAlert[] = [];

    const classes = await prisma.class.findMany({
      where: {
        course: { departmentId },
        semesterId,
        deletedAt: null,
      },
      include: {
        course: true,
        lecturer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        attendances: true,
        schedules: true,
      },
    });

    for (const cls of classes) {
      // Calculate attendance rate
      const totalAttendances = cls.attendances.length;
      const presentAttendances = cls.attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attendanceRate =
        totalAttendances > 0 ? (presentAttendances / totalAttendances) * 100 : 0;

      // Alert for low attendance (below 75%)
      if (attendanceRate < 75 && totalAttendances > 0) {
        alerts.push({
          classId: cls.id,
          className: cls.name,
          courseName: cls.course.name,
          lecturerName: `${cls.lecturer.user.firstName} ${cls.lecturer.user.lastName}`,
          attendanceRate: Math.round(attendanceRate),
          alertType: 'LOW_ATTENDANCE',
          description: `Class attendance is ${Math.round(attendanceRate)}% (below 75% threshold)`,
        });
      }

      // Check for missing attendance (if class had schedule but no recent attendance)
      // This is a simplified check - in production would be more sophisticated
      if (cls.schedules.length > 0 && totalAttendances === 0) {
        alerts.push({
          classId: cls.id,
          className: cls.name,
          courseName: cls.course.name,
          lecturerName: `${cls.lecturer.user.firstName} ${cls.lecturer.user.lastName}`,
          attendanceRate: 0,
          alertType: 'MISSING_ATTENDANCE',
          description: 'No attendance records found for this class',
        });
      }
    }

    return alerts;
  }

  /**
   * Get grading progress for department classes
   */
  async getGradingProgress(
    departmentId: string,
    semesterId: string
  ): Promise<GradingProgressReport[]> {
    const today = new Date();

    const classes = await prisma.class.findMany({
      where: {
        course: { departmentId },
        semesterId,
        deletedAt: null,
      },
      include: {
        course: true,
        lecturer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        enrollments: {
          where: { status: 'REGISTERED' },
        },
        gradeComponents: {
          include: { entries: true },
        },
      },
    });

    return classes.map((cls) => {
      const components = cls.gradeComponents.map((comp) => {
        const progress =
          cls.enrollments.length > 0
            ? (comp.entries.length / cls.enrollments.length) * 100
            : 0;

        const isOverdue = comp.dueDate ? new Date(comp.dueDate) < today && progress < 100 : false;

        return {
          name: comp.name,
          type: comp.type,
          progress: Math.round(progress),
          dueDate: comp.dueDate,
          isOverdue,
        };
      });

      // Calculate overall progress
      let totalGradeSlots = 0;
      let filledGradeSlots = 0;
      for (const component of cls.gradeComponents) {
        totalGradeSlots += cls.enrollments.length;
        filledGradeSlots += component.entries.length;
      }
      const overallProgress =
        totalGradeSlots > 0 ? (filledGradeSlots / totalGradeSlots) * 100 : 0;

      return {
        classId: cls.id,
        className: cls.name,
        courseName: cls.course.name,
        lecturerName: `${cls.lecturer.user.firstName} ${cls.lecturer.user.lastName}`,
        components,
        overallProgress: Math.round(overallProgress),
      };
    });
  }

  /**
   * Assign lecturer to a class
   */
  async assignLecturerToClass(
    classId: string,
    lecturerId: string,
    assignedBy: string
  ): Promise<void> {
    // Verify class exists
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw AppError.notFound('Class not found');
    }

    // Verify lecturer exists and is active
    const lecturer = await prisma.employee.findFirst({
      where: {
        id: lecturerId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!lecturer) {
      throw AppError.notFound('Lecturer not found or inactive');
    }

    const oldLecturerId = classEntity.lecturerId;

    await prisma.class.update({
      where: { id: classId },
      data: { lecturerId },
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: 'Class',
      resourceId: classId,
      userId: assignedBy,
      oldValues: { lecturerId: oldLecturerId },
      newValues: { lecturerId },
    });
  }

  /**
   * Get Dean dashboard data
   */
  async getDeanDashboard(userId: string, semesterId?: string): Promise<DeanDashboard> {
    // Get the Dean's faculty
    const employee = await prisma.employee.findFirst({
      where: { userId },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
      },
    });

    if (!employee || !employee.department?.faculty) {
      throw AppError.notFound('Faculty not found for this user');
    }

    const faculty = employee.department.faculty;

    // Get current or specified semester
    let semester;
    if (semesterId) {
      semester = await prisma.semester.findUnique({
        where: { id: semesterId },
      });
    } else {
      semester = await prisma.semester.findFirst({
        where: { isCurrent: true },
      });
    }

    if (!semester) {
      throw AppError.notFound('No active semester found');
    }

    // Get all departments in the faculty
    const departments = await prisma.department.findMany({
      where: {
        facultyId: faculty.id,
        deletedAt: null,
      },
      include: {
        hod: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const facultyCount = await prisma.employee.count({
          where: {
            departmentId: dept.id,
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

        const classes = await prisma.class.findMany({
          where: {
            course: { departmentId: dept.id },
            semesterId: semester.id,
            deletedAt: null,
          },
          include: {
            enrollments: { where: { status: 'REGISTERED' } },
            attendances: true,
          },
        });

        let totalStudents = 0;
        let totalAttendances = 0;
        let presentAttendances = 0;

        for (const cls of classes) {
          totalStudents += cls.enrollments.length;
          totalAttendances += cls.attendances.length;
          presentAttendances += cls.attendances.filter(
            (a) => a.status === 'PRESENT' || a.status === 'LATE'
          ).length;
        }

        const averageAttendance =
          totalAttendances > 0 ? (presentAttendances / totalAttendances) * 100 : 0;

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          hodName: dept.hod
            ? `${dept.hod.user.firstName} ${dept.hod.user.lastName}`
            : null,
          facultyCount,
          studentCount: totalStudents,
          classCount: classes.length,
          averageAttendance: Math.round(averageAttendance),
        };
      })
    );

    // Calculate overall stats
    const overallStats = {
      totalDepartments: departments.length,
      totalFaculty: departmentStats.reduce((sum, d) => sum + d.facultyCount, 0),
      totalStudents: departmentStats.reduce((sum, d) => sum + d.studentCount, 0),
      totalClasses: departmentStats.reduce((sum, d) => sum + d.classCount, 0),
      averageAttendance: Math.round(
        departmentStats.reduce((sum, d) => sum + d.averageAttendance, 0) / departments.length || 0
      ),
    };

    // Generate alerts
    const alerts: { type: string; departmentName: string; description: string }[] = [];

    for (const dept of departmentStats) {
      if (dept.averageAttendance < 75 && dept.classCount > 0) {
        alerts.push({
          type: 'LOW_ATTENDANCE',
          departmentName: dept.name,
          description: `Average attendance is ${dept.averageAttendance}%`,
        });
      }
    }

    return {
      faculty: {
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
      },
      currentSemester: {
        id: semester.id,
        name: semester.name,
      },
      departments: departmentStats,
      overallStats,
      alerts,
    };
  }
}

export const hodDashboardService = new HODDashboardService();
