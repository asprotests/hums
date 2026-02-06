import api from '../api';

// ============= HOD Types =============

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
    dueDate: string | null;
    isOverdue: boolean;
  }[];
  overallProgress: number;
}

export interface HODDashboard {
  department: DepartmentOverview;
  currentSemester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
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

export interface AttendanceReport {
  department: DepartmentOverview;
  semester: { id: string; name: string; startDate: string; endDate: string };
  alerts: AttendanceAlert[];
  classSummary: {
    classId: string;
    className: string;
    courseName: string;
    lecturerName: string;
    attendanceRate: number;
    enrolledCount: number;
  }[];
  facultyAttendance: {
    lecturerName: string;
    averageAttendance: number;
    classCount: number;
  }[];
}

export interface GradingReport {
  department: DepartmentOverview;
  semester: { id: string; name: string; startDate: string; endDate: string };
  gradingProgress: GradingProgressReport[];
  overdueSummary: GradingProgressReport[];
  facultyProgress: {
    lecturerName: string;
    gradingProgress: number;
    classCount: number;
  }[];
}

// ============= Dean Types =============

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

export interface FacultyOverviewReport {
  faculty: { id: string; name: string; code: string };
  semester: { id: string; name: string };
  overallStats: {
    totalDepartments: number;
    totalFaculty: number;
    totalStudents: number;
    totalClasses: number;
    averageAttendance: number;
  };
  departmentComparison: {
    name: string;
    code: string;
    hodName: string | null;
    facultyCount: number;
    studentCount: number;
    classCount: number;
    averageAttendance: number;
  }[];
  alerts: { type: string; departmentName: string; description: string }[];
}

export interface StudentPerformanceReport {
  faculty: { id: string; name: string; code: string };
  semester: { id: string; name: string };
  totalStudents: number;
  departmentPerformance: {
    name: string;
    code: string;
    studentCount: number;
    averageAttendance: number;
  }[];
  overallAttendance: number;
}

// ============= HOD API Functions =============

export const hodDashboardApi = {
  /**
   * Get HOD dashboard data
   */
  getDashboard: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: HODDashboard }>(
      `/hod/dashboard?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get department classes
   */
  getClasses: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: ClassOverview[] }>(
      `/hod/classes?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get department faculty
   */
  getFaculty: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: FacultyWorkload[] }>(
      `/hod/faculty?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get workload for a specific faculty member
   */
  getFacultyWorkload: async (lecturerId: string, semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{
      success: boolean;
      data: FacultyWorkload & { classes: ClassOverview[] };
    }>(`/hod/faculty/${lecturerId}/workload?${params.toString()}`);
    return response.data;
  },

  /**
   * Assign lecturer to a class
   */
  assignLecturerToClass: async (classId: string, lecturerId: string) => {
    const response = await api.post<{ success: boolean }>(
      `/hod/classes/${classId}/assign-lecturer`,
      { lecturerId }
    );
    return response.data;
  },

  /**
   * Get attendance report
   */
  getAttendanceReport: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: AttendanceReport }>(
      `/hod/reports/attendance?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get grading progress report
   */
  getGradingProgressReport: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: GradingReport }>(
      `/hod/reports/grading-progress?${params.toString()}`
    );
    return response.data;
  },
};

// ============= Dean API Functions =============

export const deanDashboardApi = {
  /**
   * Get Dean dashboard data
   */
  getDashboard: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: DeanDashboard }>(
      `/dean/dashboard?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get all departments in the faculty
   */
  getDepartments: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{
      success: boolean;
      data: DeanDashboard['departments'];
    }>(`/dean/departments?${params.toString()}`);
    return response.data;
  },

  /**
   * Get faculty overview report
   */
  getFacultyOverviewReport: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: FacultyOverviewReport }>(
      `/dean/reports/faculty-overview?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get student performance report
   */
  getStudentPerformanceReport: async (semesterId?: string) => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<{ success: boolean; data: StudentPerformanceReport }>(
      `/dean/reports/student-performance?${params.toString()}`
    );
    return response.data;
  },
};

export default { hodDashboardApi, deanDashboardApi };
