import api, { type ApiResponse } from '../api';

// ============ Types ============

export type ExamType = 'MIDTERM' | 'FINAL' | 'QUIZ' | 'MAKEUP';
export type ExamStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Exam {
  id: string;
  classId: string;
  type: ExamType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  roomId: string;
  maxScore: number;
  instructions?: string;
  status: ExamStatus;
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      nameLocal?: string;
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
    enrollments?: Array<{
      status: string;
      student: {
        id: string;
        studentId: string;
        user: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
  };
  room: {
    id: string;
    name: string;
    building?: string;
    capacity: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExamConflict {
  type: 'student' | 'room';
  description: string;
  examId?: string;
  examTitle?: string;
}

export interface CreateExamResult {
  exam: Exam;
  conflicts: ExamConflict[];
}

export interface ExamFilters {
  page?: number;
  limit?: number;
  classId?: string;
  semesterId?: string;
  type?: ExamType;
  status?: ExamStatus;
  startDate?: string;
  endDate?: string;
}

export interface ExamScheduleDay {
  date: string;
  exams: Exam[];
}

// ============ Input Types ============

export interface CreateExamInput {
  classId: string;
  type: ExamType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  roomId: string;
  maxScore: number;
  instructions?: string;
}

export interface UpdateExamInput {
  type?: ExamType;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  roomId?: string;
  maxScore?: number;
  instructions?: string | null;
  status?: ExamStatus;
}

// ============ Exam API ============

export const examsApi = {
  getAll: async (filters: ExamFilters = {}): Promise<ApiResponse<Exam[]>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.semesterId) params.append('semesterId', filters.semesterId);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<ApiResponse<Exam[]>>(`/api/v1/exams?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Exam>> => {
    const response = await api.get<ApiResponse<Exam>>(`/api/v1/exams/${id}`);
    return response.data;
  },

  create: async (data: CreateExamInput): Promise<ApiResponse<CreateExamResult>> => {
    const response = await api.post<ApiResponse<CreateExamResult>>('/api/v1/exams', data);
    return response.data;
  },

  update: async (id: string, data: UpdateExamInput): Promise<ApiResponse<Exam>> => {
    const response = await api.patch<ApiResponse<Exam>>(`/api/v1/exams/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/exams/${id}`);
    return response.data;
  },

  cancel: async (id: string, reason: string): Promise<ApiResponse<Exam>> => {
    const response = await api.post<ApiResponse<Exam>>(`/api/v1/exams/${id}/cancel`, { reason });
    return response.data;
  },

  getSchedule: async (semesterId: string): Promise<ApiResponse<ExamScheduleDay[]>> => {
    const response = await api.get<ApiResponse<ExamScheduleDay[]>>(`/api/v1/exams/schedule/${semesterId}`);
    return response.data;
  },

  getByClass: async (classId: string): Promise<ApiResponse<Exam[]>> => {
    const response = await api.get<ApiResponse<Exam[]>>(`/api/v1/exams/class/${classId}`);
    return response.data;
  },

  getByStudent: async (studentId: string): Promise<ApiResponse<Exam[]>> => {
    const response = await api.get<ApiResponse<Exam[]>>(`/api/v1/exams/student/${studentId}`);
    return response.data;
  },

  checkConflicts: async (id: string): Promise<ApiResponse<{ conflicts: ExamConflict[] }>> => {
    const response = await api.get<ApiResponse<{ conflicts: ExamConflict[] }>>(`/api/v1/exams/${id}/check-conflicts`);
    return response.data;
  },
};

export default examsApi;
