import api from '../api';

// ============= Types =============

export interface LecturerClassSummary {
  classId: string;
  className: string;
  courseName: string;
  courseCode: string;
  enrolledCount: number;
  attendancePercentage: number;
  gradingProgress: number;
  nextClass: string | null;
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
  dueDate?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Activity {
  type: string;
  description: string;
  classId?: string;
  className?: string;
  timestamp: string;
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
    startDate: string;
    endDate: string;
  };
  classes: LecturerClassSummary[];
  todaySchedule: ScheduleItem[];
  pendingTasks: PendingTask[];
  recentActivity: Activity[];
  statistics: LecturerStats;
}

// ============= API Functions =============

export const lecturerDashboardApi = {
  /**
   * Get lecturer dashboard data
   */
  getDashboard: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: LecturerDashboard }>(
      `/lecturer/dashboard?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get lecturer's classes
   */
  getClasses: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: LecturerClassSummary[] }>(
      `/lecturer/classes?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get details for a specific class
   */
  getClassById: async (classId: string) => {
    const response = await api.get<{ success: boolean; data: LecturerClassSummary }>(
      `/lecturer/classes/${classId}`
    );
    return response.data;
  },

  /**
   * Get lecturer's schedule for a date
   */
  getSchedule: async (date?: Date) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date.toISOString());

    const response = await api.get<{ success: boolean; data: ScheduleItem[] }>(
      `/lecturer/schedule?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get pending tasks
   */
  getPendingTasks: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: PendingTask[] }>(
      `/lecturer/pending-tasks?${params.toString()}`
    );
    return response.data;
  },
};

export default lecturerDashboardApi;
