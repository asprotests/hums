import api, { type ApiResponse } from '../api';

export type EnrollmentStatus = 'REGISTERED' | 'DROPPED' | 'COMPLETED' | 'FAILED';

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  semesterId: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    program?: {
      id: string;
      name: string;
      code: string;
    };
  };
  class?: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      code: string;
      credits: number;
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
    room?: {
      id: string;
      name: string;
      building: string;
    };
    schedules?: Array<{
      id: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      type: string;
    }>;
  };
}

export interface EnrollInput {
  studentId: string;
  classId: string;
  overridePrerequisites?: boolean;
  overrideReason?: string;
}

export interface DropInput {
  studentId: string;
  classId: string;
  reason?: string;
}

export interface BulkEnrollInput {
  classId: string;
  studentIds: string[];
}

export interface EnrollmentFilters {
  studentId?: string;
  classId?: string;
  semesterId?: string;
  status?: EnrollmentStatus;
}

export interface PrerequisiteCheck {
  met: boolean;
  missing: Array<{ id: string; code: string; name: string }>;
  overridden: Array<{ id: string; code: string; name: string }>;
}

export interface ScheduleConflictCheck {
  hasConflict: boolean;
  conflicts: Array<{
    classId: string;
    className: string;
    scheduleDetails: string;
  }>;
}

export interface AvailableClass {
  id: string;
  name: string;
  courseId: string;
  semesterId: string;
  capacity: number;
  status: string;
  course: {
    id: string;
    name: string;
    code: string;
    credits: number;
    prerequisites: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  lecturer?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  room?: {
    id: string;
    name: string;
    building: string;
  };
  schedules: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    type: string;
  }>;
  enrollmentCount: number;
  availableSeats: number;
  isEnrolled: boolean;
  isFull: boolean;
  prerequisitesMet: boolean;
  missingPrerequisites: Array<{ id: string; code: string; name: string }>;
  hasScheduleConflict: boolean;
  scheduleConflicts: Array<{
    classId: string;
    className: string;
    scheduleDetails: string;
  }>;
  canEnroll: boolean;
}

export interface BulkEnrollResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    studentId: string;
    success: boolean;
    error?: string;
    enrollment?: Enrollment;
  }>;
}

export const enrollmentsApi = {
  getAll: async (filters?: EnrollmentFilters): Promise<Enrollment[]> => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.classId) params.append('classId', filters.classId);
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<ApiResponse<Enrollment[]>>(`/api/v1/enrollments?${params.toString()}`);
    return response.data.data!;
  },

  getById: async (id: string): Promise<Enrollment> => {
    const response = await api.get<ApiResponse<Enrollment>>(`/api/v1/enrollments/${id}`);
    return response.data.data!;
  },

  enroll: async (data: EnrollInput): Promise<Enrollment> => {
    const response = await api.post<ApiResponse<Enrollment>>('/api/v1/enrollments', data);
    return response.data.data!;
  },

  drop: async (data: DropInput): Promise<Enrollment> => {
    const response = await api.post<ApiResponse<Enrollment>>('/api/v1/enrollments/drop', data);
    return response.data.data!;
  },

  bulkEnroll: async (data: BulkEnrollInput): Promise<BulkEnrollResult> => {
    const response = await api.post<ApiResponse<BulkEnrollResult>>('/api/v1/enrollments/bulk', data);
    return response.data.data!;
  },

  getStudentSchedule: async (studentId: string, semesterId?: string): Promise<Enrollment[]> => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<ApiResponse<Enrollment[]>>(
      `/api/v1/enrollments/student/${studentId}/schedule?${params.toString()}`
    );
    return response.data.data!;
  },

  getAvailableClasses: async (studentId: string, semesterId?: string): Promise<AvailableClass[]> => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const response = await api.get<ApiResponse<AvailableClass[]>>(
      `/api/v1/enrollments/student/${studentId}/available-classes?${params.toString()}`
    );
    return response.data.data!;
  },

  checkPrerequisites: async (studentId: string, courseId: string): Promise<PrerequisiteCheck> => {
    const response = await api.post<ApiResponse<PrerequisiteCheck>>('/api/v1/enrollments/check-prerequisites', {
      studentId,
      courseId,
    });
    return response.data.data!;
  },

  checkScheduleConflicts: async (studentId: string, classId: string): Promise<ScheduleConflictCheck> => {
    const response = await api.post<ApiResponse<ScheduleConflictCheck>>('/api/v1/enrollments/check-schedule-conflicts', {
      studentId,
      classId,
    });
    return response.data.data!;
  },
};
