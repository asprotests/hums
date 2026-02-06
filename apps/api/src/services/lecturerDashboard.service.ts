import { prisma } from '@hums/database';
import type { Prisma } from '@hums/database';

export interface LecturerClassSummary {
  classId: string;
  className: string;
  courseName: string;
  courseCode: string;
  enrolledCount: number;
  attendancePercentage: number;
  gradingProgress: number;
  nextClass: Date | null;
  roomName: string | null;
}

export interface ScheduleItem {
  classId: string;
  className: string;
  courseName: string;
  courseCode: string;
  startTime: string;
  endTime: string;
  roomName: string | null;
  roomId: string | null;
  scheduleType: string;
}

export interface PendingTask {
  type: 'ATTENDANCE' | 'GRADING' | 'EXAM';
  classId: string;
  className: string;
  courseName: string;
  description: string;
  dueDate?: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Activity {
  type: string;
  description: string;
  classId?: string;
  className?: string;
  timestamp: Date;
}

export interface LecturerStats {
  totalClasses: number;
  totalStudents: number;
  averageAttendance: number;
  pendingGrades: number;
  upcomingExams: number;
}

export interface LecturerDashboard {
  currentSemester: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  classes: LecturerClassSummary[];
  todaySchedule: ScheduleItem[];
  pendingTasks: PendingTask[];
  recentActivity: Activity[];
  statistics: LecturerStats;
}

export class LecturerDashboardService {
  /**
   * Get the lecturer's employee ID from user ID
   */
  private async getLecturerId(userId: string): Promise<string | null> {
    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
    return employee?.id || null;
  }

  /**
   * Get lecturer dashboard data
   */
  async getLecturerDashboard(userId: string, semesterId?: string): Promise<LecturerDashboard> {
    const lecturerId = await this.getLecturerId(userId);
    if (!lecturerId) {
      throw new Error('Lecturer not found');
    }

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
      throw new Error('No active semester found');
    }

    // Get all classes for this lecturer in the semester
    const classes = await this.getLecturerClasses(userId, semester.id);

    // Get today's schedule
    const todaySchedule = await this.getLecturerSchedule(userId, new Date());

    // Get pending tasks
    const pendingTasks = await this.getPendingTasks(lecturerId, semester.id);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(lecturerId, semester.id);

    // Calculate statistics
    const statistics = await this.calculateStatistics(lecturerId, semester.id);

    return {
      currentSemester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
      },
      classes,
      todaySchedule,
      pendingTasks,
      recentActivity,
      statistics,
    };
  }

  /**
   * Get all classes for a lecturer
   */
  async getLecturerClasses(userId: string, semesterId?: string): Promise<LecturerClassSummary[]> {
    const lecturerId = await this.getLecturerId(userId);
    if (!lecturerId) {
      return [];
    }

    const where: Prisma.ClassWhereInput = {
      lecturerId,
      deletedAt: null,
    };

    if (semesterId) {
      where.semesterId = semesterId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        course: true,
        room: true,
        enrollments: {
          where: { status: 'REGISTERED' },
        },
        attendances: true,
        gradeComponents: {
          include: {
            entries: true,
          },
        },
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return classes.map((cls) => {
      // Calculate attendance percentage
      const totalAttendances = cls.attendances.length;
      const presentAttendances = cls.attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attendancePercentage =
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

      // Calculate next class
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      let nextClass: Date | null = null;
      for (const schedule of cls.schedules) {
        if (
          schedule.dayOfWeek > dayOfWeek ||
          (schedule.dayOfWeek === dayOfWeek && schedule.startTime > currentTime)
        ) {
          const daysUntil = (schedule.dayOfWeek - dayOfWeek + 7) % 7 || 7;
          nextClass = new Date(now);
          nextClass.setDate(now.getDate() + daysUntil);
          const [hours, minutes] = schedule.startTime.split(':');
          nextClass.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          break;
        }
      }

      return {
        classId: cls.id,
        className: cls.name,
        courseName: cls.course.name,
        courseCode: cls.course.code,
        enrolledCount: cls.enrollments.length,
        attendancePercentage: Math.round(attendancePercentage),
        gradingProgress: Math.round(gradingProgress),
        nextClass,
        roomName: cls.room?.name || null,
      };
    });
  }

  /**
   * Get lecturer's schedule for a specific date
   */
  async getLecturerSchedule(userId: string, date: Date = new Date()): Promise<ScheduleItem[]> {
    const lecturerId = await this.getLecturerId(userId);
    if (!lecturerId) {
      return [];
    }

    const dayOfWeek = date.getDay();

    // Get current semester
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    if (!currentSemester) {
      return [];
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        dayOfWeek,
        class: {
          lecturerId,
          semesterId: currentSemester.id,
          deletedAt: null,
        },
      },
      include: {
        class: {
          include: {
            course: true,
          },
        },
        room: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return schedules.map((s) => ({
      classId: s.classId,
      className: s.class.name,
      courseName: s.class.course.name,
      courseCode: s.class.course.code,
      startTime: s.startTime,
      endTime: s.endTime,
      roomName: s.room?.name || null,
      roomId: s.roomId,
      scheduleType: s.scheduleType,
    }));
  }

  /**
   * Get pending tasks for a lecturer
   */
  async getPendingTasks(lecturerId: string, semesterId: string): Promise<PendingTask[]> {
    const tasks: PendingTask[] = [];

    // Get classes for this lecturer
    const classes = await prisma.class.findMany({
      where: {
        lecturerId,
        semesterId,
        deletedAt: null,
      },
      include: {
        course: true,
        enrollments: {
          where: { status: 'REGISTERED' },
        },
        gradeComponents: {
          include: {
            entries: true,
          },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        schedules: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const cls of classes) {
      // Check for missing attendance (if there was a class yesterday or earlier this week)
      const lastAttendance = cls.attendances[0];
      const dayOfWeek = today.getDay();

      for (const schedule of cls.schedules) {
        if (schedule.dayOfWeek < dayOfWeek) {
          const classDate = new Date(today);
          classDate.setDate(today.getDate() - (dayOfWeek - schedule.dayOfWeek));

          if (!lastAttendance || new Date(lastAttendance.date) < classDate) {
            tasks.push({
              type: 'ATTENDANCE',
              classId: cls.id,
              className: cls.name,
              courseName: cls.course.name,
              description: `Mark attendance for ${classDate.toLocaleDateString()}`,
              dueDate: classDate,
              priority: 'HIGH',
            });
          }
        }
      }

      // Check for incomplete grading
      for (const component of cls.gradeComponents) {
        const missingGrades = cls.enrollments.length - component.entries.length;
        if (missingGrades > 0 && component.dueDate) {
          const dueDate = new Date(component.dueDate);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          if (daysUntilDue <= 0) priority = 'HIGH';
          else if (daysUntilDue <= 3) priority = 'MEDIUM';

          tasks.push({
            type: 'GRADING',
            classId: cls.id,
            className: cls.name,
            courseName: cls.course.name,
            description: `Enter ${component.name} grades (${missingGrades} remaining)`,
            dueDate: component.dueDate,
            priority,
          });
        }
      }
    }

    // Check for upcoming exams that need scheduling
    const exams = await prisma.exam.findMany({
      where: {
        class: {
          lecturerId,
          semesterId,
        },
        status: 'SCHEDULED',
        date: {
          gte: today,
          lte: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Next 2 weeks
        },
      },
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    for (const exam of exams) {
      const daysUntil = Math.ceil(
        (new Date(exam.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      tasks.push({
        type: 'EXAM',
        classId: exam.classId,
        className: exam.class.name,
        courseName: exam.class.course.name,
        description: `${exam.title} scheduled for ${new Date(exam.date).toLocaleDateString()}`,
        dueDate: exam.date,
        priority: daysUntil <= 3 ? 'HIGH' : daysUntil <= 7 ? 'MEDIUM' : 'LOW',
      });
    }

    // Sort by priority and due date
    return tasks.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  }

  /**
   * Get recent activity for a lecturer
   */
  async getRecentActivity(lecturerId: string, semesterId: string): Promise<Activity[]> {
    const activities: Activity[] = [];

    // Get recent attendance records
    const recentAttendances = await prisma.studentAttendance.findMany({
      where: {
        class: {
          lecturerId,
          semesterId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      distinct: ['classId', 'date'],
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    for (const att of recentAttendances) {
      activities.push({
        type: 'ATTENDANCE',
        description: `Attendance marked for ${att.class.name}`,
        classId: att.classId,
        className: att.class.name,
        timestamp: att.createdAt,
      });
    }

    // Get recent grade entries
    const recentGrades = await prisma.gradeEntry.findMany({
      where: {
        component: {
          class: {
            lecturerId,
            semesterId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      distinct: ['componentId'],
      include: {
        component: {
          include: {
            class: {
              include: { course: true },
            },
          },
        },
      },
    });

    for (const grade of recentGrades) {
      activities.push({
        type: 'GRADING',
        description: `${grade.component.name} grades entered for ${grade.component.class.name}`,
        classId: grade.component.classId,
        className: grade.component.class.name,
        timestamp: grade.createdAt,
      });
    }

    // Get recent material uploads
    const recentMaterials = await prisma.courseMaterial.findMany({
      where: {
        class: {
          lecturerId,
          semesterId,
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        class: {
          include: { course: true },
        },
      },
    });

    for (const material of recentMaterials) {
      activities.push({
        type: 'MATERIAL',
        description: `Uploaded "${material.title}" to ${material.class.name}`,
        classId: material.classId,
        className: material.class.name,
        timestamp: material.createdAt,
      });
    }

    // Sort by timestamp and return top 10
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }

  /**
   * Calculate statistics for a lecturer
   */
  async calculateStatistics(lecturerId: string, semesterId: string): Promise<LecturerStats> {
    // Get classes
    const classes = await prisma.class.findMany({
      where: {
        lecturerId,
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
    });

    const totalClasses = classes.length;
    const totalStudents = classes.reduce((sum, c) => sum + c.enrollments.length, 0);

    // Calculate average attendance
    let totalAttendances = 0;
    let presentAttendances = 0;
    for (const cls of classes) {
      totalAttendances += cls.attendances.length;
      presentAttendances += cls.attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
    }
    const averageAttendance =
      totalAttendances > 0 ? (presentAttendances / totalAttendances) * 100 : 0;

    // Calculate pending grades
    let pendingGrades = 0;
    for (const cls of classes) {
      for (const component of cls.gradeComponents) {
        pendingGrades += cls.enrollments.length - component.entries.length;
      }
    }

    // Count upcoming exams
    const today = new Date();
    const upcomingExams = await prisma.exam.count({
      where: {
        class: {
          lecturerId,
          semesterId,
        },
        status: 'SCHEDULED',
        date: { gte: today },
      },
    });

    return {
      totalClasses,
      totalStudents,
      averageAttendance: Math.round(averageAttendance),
      pendingGrades,
      upcomingExams,
    };
  }
}

export const lecturerDashboardService = new LecturerDashboardService();
