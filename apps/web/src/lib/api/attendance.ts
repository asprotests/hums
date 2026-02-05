import api, { type ApiResponse } from '../api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type ExcuseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  markedById: string;
  markedAt: string;
  remarks?: string;
  excuseId?: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  markedBy?: {
    firstName: string;
    lastName: string;
  };
  excuse?: AttendanceExcuse;
}

export interface AttendanceExcuse {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  reason: string;
  documentUrl?: string;
  status: ExcuseStatus;
  reviewedById?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  class?: {
    id: string;
    name: string;
    course: {
      name: string;
      code: string;
    };
  };
}

export interface ClassAttendanceItem {
  studentId: string;
  student: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  attendance: AttendanceRecord | null;
  status: AttendanceStatus | 'NOT_MARKED';
  remarks?: string;
}

export interface AttendanceSummary {
  studentId: string;
  semesterId: string;
  overall: {
    totalClasses: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  byClass: Array<{
    classId: string;
    className: string;
    courseName: string;
    courseCode: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    totalClasses: number;
    percentage: number;
  }>;
}

export interface ClassAttendanceReport {
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      code: string;
    };
    semester: {
      id: string;
      name: string;
    };
    lecturer?: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  statistics: {
    totalStudents: number;
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    averageAttendance: number;
    studentsAtRisk: number;
  };
  studentsAtRisk: Array<{
    studentId: string;
    studentName: string;
    percentage: number;
  }>;
  sessions: string[];
}

export interface StudentBelowThreshold {
  studentId: string;
  studentName: string;
  percentage: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalClasses: number;
}

export interface MarkAttendanceInput {
  classId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface SubmitExcuseInput {
  studentId: string;
  classId: string;
  date: string;
  reason: string;
  documentUrl?: string;
}

export interface StudentAttendanceFilters {
  classId?: string;
  semesterId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
}

export const attendanceApi = {
  // Mark attendance for a class
  markAttendance: async (classId: string, data: Omit<MarkAttendanceInput, 'classId'>): Promise<AttendanceRecord[]> => {
    const response = await api.post<ApiResponse<AttendanceRecord[]>>(
      `/api/v1/attendance/class/${classId}/mark`,
      { ...data, classId }
    );
    return response.data.data!;
  },

  // Get class attendance for a specific date
  getClassAttendance: async (classId: string, date: string): Promise<ClassAttendanceItem[]> => {
    const response = await api.get<ApiResponse<ClassAttendanceItem[]>>(
      `/api/v1/attendance/class/${classId}?date=${date}`
    );
    return response.data.data!;
  },

  // Get class attendance for a date range
  getClassAttendanceByDateRange: async (
    classId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    const response = await api.get<ApiResponse<AttendanceRecord[]>>(
      `/api/v1/attendance/class/${classId}?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data!;
  },

  // Get class attendance report
  getClassAttendanceReport: async (classId: string): Promise<ClassAttendanceReport> => {
    const response = await api.get<ApiResponse<ClassAttendanceReport>>(
      `/api/v1/attendance/class/${classId}/report`
    );
    return response.data.data!;
  },

  // Get students below attendance threshold
  getStudentsBelowThreshold: async (classId: string, threshold: number = 75): Promise<StudentBelowThreshold[]> => {
    const response = await api.get<ApiResponse<StudentBelowThreshold[]>>(
      `/api/v1/attendance/class/${classId}/below-threshold?threshold=${threshold}`
    );
    return response.data.data!;
  },

  // Get student attendance
  getStudentAttendance: async (studentId: string, filters?: StudentAttendanceFilters): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.classId) params.append('classId', filters.classId);
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<ApiResponse<AttendanceRecord[]>>(
      `/api/v1/attendance/student/${studentId}?${params.toString()}`
    );
    return response.data.data!;
  },

  // Get student attendance summary
  getStudentAttendanceSummary: async (studentId: string, semesterId?: string): Promise<AttendanceSummary> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    const response = await api.get<ApiResponse<AttendanceSummary>>(
      `/api/v1/attendance/student/${studentId}/summary${params}`
    );
    return response.data.data!;
  },

  // Update attendance record
  updateAttendance: async (id: string, status: AttendanceStatus, remarks?: string): Promise<AttendanceRecord> => {
    const response = await api.patch<ApiResponse<AttendanceRecord>>(`/api/v1/attendance/${id}`, {
      status,
      remarks,
    });
    return response.data.data!;
  },

  // Submit excuse
  submitExcuse: async (data: SubmitExcuseInput): Promise<AttendanceExcuse> => {
    const response = await api.post<ApiResponse<AttendanceExcuse>>('/api/v1/attendance/excuse', data);
    return response.data.data!;
  },

  // Get pending excuses
  getPendingExcuses: async (classId?: string): Promise<AttendanceExcuse[]> => {
    const params = classId ? `?classId=${classId}` : '';
    const response = await api.get<ApiResponse<AttendanceExcuse[]>>(`/api/v1/attendance/excuses/pending${params}`);
    return response.data.data!;
  },

  // Approve excuse
  approveExcuse: async (id: string, remarks?: string): Promise<AttendanceExcuse> => {
    const response = await api.patch<ApiResponse<AttendanceExcuse>>(`/api/v1/attendance/excuse/${id}/approve`, {
      remarks,
    });
    return response.data.data!;
  },

  // Reject excuse
  rejectExcuse: async (id: string, remarks: string): Promise<AttendanceExcuse> => {
    const response = await api.patch<ApiResponse<AttendanceExcuse>>(`/api/v1/attendance/excuse/${id}/reject`, {
      remarks,
    });
    return response.data.data!;
  },

  // Get student's excuses
  getStudentExcuses: async (studentId: string): Promise<AttendanceExcuse[]> => {
    const response = await api.get<ApiResponse<AttendanceExcuse[]>>(
      `/api/v1/attendance/student/${studentId}/excuses`
    );
    return response.data.data!;
  },
};
