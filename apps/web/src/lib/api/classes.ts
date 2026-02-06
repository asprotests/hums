import api, { type ApiResponse } from '../api';

// ============ Types ============

export type ClassStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface ClassEntity {
  id: string;
  name: string;
  courseId: string;
  semesterId: string;
  lecturerId: string;
  capacity: number;
  enrolledCount: number;
  roomId?: string;
  status: ClassStatus;
  cancelReason?: string;
  course: {
    id: string;
    name: string;
    nameLocal?: string;
    code: string;
    credits: number;
  };
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  lecturer: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  room?: {
    id: string;
    name: string;
    building?: string;
    capacity: number;
  };
  schedules?: Schedule[];
  enrollments?: ClassStudent[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  classId: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'EXAM';
  room?: {
    id: string;
    name: string;
    building?: string;
  };
}

export interface ClassStudent {
  enrollmentId: string;
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    program?: string;
  };
  enrolledAt: string;
}

export interface ClassFilters {
  page?: number;
  limit?: number;
  search?: string;
  semesterId?: string;
  courseId?: string;
  lecturerId?: string;
  status?: ClassStatus;
}

export interface PaginatedClasses {
  data: ClassEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClassInput {
  courseId: string;
  semesterId: string;
  lecturerId: string;
  capacity: number;
  name?: string;
  roomId?: string;
}

export interface UpdateClassInput {
  name?: string;
  lecturerId?: string;
  capacity?: number;
  roomId?: string | null;
  status?: ClassStatus;
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: ClassEntity[];
  pagination: PaginatedClasses['pagination'];
  message?: string;
}

// ============ Class API ============

export const classesApi = {
  // Lecturer-specific endpoints
  getMyClasses: async (semesterId?: string): Promise<ApiResponse<ClassEntity[]>> => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);
    const response = await api.get<ApiResponse<ClassEntity[]>>(`/api/v1/lecturer/classes?${params.toString()}`);
    return response.data;
  },

  getClass: async (id: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.get<ApiResponse<ClassEntity>>(`/api/v1/lecturer/classes/${id}`);
    return response.data;
  },

  // Admin endpoints
  getClasses: async (filters: ClassFilters = {}): Promise<ApiResponse<PaginatedClasses>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.semesterId) params.append('semesterId', filters.semesterId);
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.lecturerId) params.append('lecturerId', filters.lecturerId);
    if (filters.status) params.append('status', filters.status);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/classes?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getClassById: async (id: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.get<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}`);
    return response.data;
  },

  createClass: async (data: CreateClassInput): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.post<ApiResponse<ClassEntity>>('/api/v1/classes', data);
    return response.data;
  },

  updateClass: async (id: string, data: UpdateClassInput): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.patch<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}`, data);
    return response.data;
  },

  deleteClass: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/classes/${id}`);
    return response.data;
  },

  cancelClass: async (id: string, reason: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.post<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/cancel`, { reason });
    return response.data;
  },

  closeClass: async (id: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.post<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/close`);
    return response.data;
  },

  reopenClass: async (id: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.post<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/reopen`);
    return response.data;
  },

  splitClass: async (id: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.post<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/split`);
    return response.data;
  },

  assignLecturer: async (id: string, lecturerId: string): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.patch<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/lecturer`, { lecturerId });
    return response.data;
  },

  assignRoom: async (id: string, roomId: string | null): Promise<ApiResponse<ClassEntity>> => {
    const response = await api.patch<ApiResponse<ClassEntity>>(`/api/v1/classes/${id}/room`, { roomId });
    return response.data;
  },

  getStudents: async (id: string): Promise<ApiResponse<ClassStudent[]>> => {
    const response = await api.get<ApiResponse<ClassStudent[]>>(`/api/v1/classes/${id}/students`);
    return response.data;
  },
};

export default classesApi;
