import api, { type ApiResponse } from '../api';

// ============ Types ============

export type ProgramType = 'CERTIFICATE' | 'DIPLOMA' | 'BACHELOR' | 'MASTER';

export interface Program {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  type: ProgramType;
  durationYears: number;
  totalCredits: number;
  department?: {
    id: string;
    name: string;
    code: string;
    faculty?: {
      id: string;
      name: string;
    };
  };
  studentCount: number;
  courseCount: number;
  createdAt: string;
  updatedAt: string;
  curriculum?: CurriculumCourse[];
}

export interface CurriculumCourse {
  courseId: string;
  code: string;
  name: string;
  nameLocal?: string;
  credits: number;
  semester: number;
  isElective: boolean;
}

export interface CurriculumBySemester {
  programId: string;
  programName: string;
  programCode: string;
  totalCredits: number;
  semesters: Array<{
    semester: number;
    courses: CurriculumCourse[];
    totalCredits: number;
  }>;
}

export interface StudentSummary {
  id: string;
  studentId: string;
  name: string;
  email: string;
  admissionDate: string;
  status: string;
}

export interface ProgramStatistics {
  id: string;
  name: string;
  studentCount: number;
  courseCount: number;
  graduatedCount: number;
  activeStudents: number;
}

export interface ProgramFilters {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  type?: ProgramType;
}

export interface PaginatedPrograms {
  data: Program[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedStudents {
  data: StudentSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProgramInput {
  name: string;
  nameLocal?: string;
  code: string;
  type: ProgramType;
  durationYears: number;
  totalCredits: number;
  departmentId: string;
}

export interface UpdateProgramInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  type?: ProgramType;
  durationYears?: number;
  totalCredits?: number;
  departmentId?: string;
}

export interface AddCurriculumCourseInput {
  courseId: string;
  semester: number;
  isElective?: boolean;
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: Program[];
  pagination: PaginatedPrograms['pagination'];
  message?: string;
}

interface PaginatedStudentsApiResponse {
  success: boolean;
  data: StudentSummary[];
  pagination: PaginatedStudents['pagination'];
  message?: string;
}

// ============ Program API ============

export const programsApi = {
  getPrograms: async (filters: ProgramFilters = {}): Promise<ApiResponse<PaginatedPrograms>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.type) params.append('type', filters.type);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/programs?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getProgramById: async (id: string): Promise<ApiResponse<Program>> => {
    const response = await api.get<ApiResponse<Program>>(`/api/v1/programs/${id}`);
    return response.data;
  },

  createProgram: async (data: CreateProgramInput): Promise<ApiResponse<Program>> => {
    const response = await api.post<ApiResponse<Program>>('/api/v1/programs', data);
    return response.data;
  },

  updateProgram: async (id: string, data: UpdateProgramInput): Promise<ApiResponse<Program>> => {
    const response = await api.patch<ApiResponse<Program>>(`/api/v1/programs/${id}`, data);
    return response.data;
  },

  deleteProgram: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/programs/${id}`);
    return response.data;
  },

  getCurriculum: async (programId: string): Promise<ApiResponse<CurriculumBySemester>> => {
    const response = await api.get<ApiResponse<CurriculumBySemester>>(`/api/v1/programs/${programId}/curriculum`);
    return response.data;
  },

  addCurriculumCourse: async (programId: string, data: AddCurriculumCourseInput): Promise<ApiResponse<CurriculumCourse>> => {
    const response = await api.post<ApiResponse<CurriculumCourse>>(`/api/v1/programs/${programId}/curriculum`, data);
    return response.data;
  },

  removeCurriculumCourse: async (programId: string, courseId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/programs/${programId}/curriculum/${courseId}`);
    return response.data;
  },

  getStudents: async (programId: string, page = 1, limit = 20): Promise<ApiResponse<PaginatedStudents>> => {
    const response = await api.get<PaginatedStudentsApiResponse>(
      `/api/v1/programs/${programId}/students?page=${page}&limit=${limit}`
    );
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getStatistics: async (programId: string): Promise<ApiResponse<ProgramStatistics>> => {
    const response = await api.get<ApiResponse<ProgramStatistics>>(`/api/v1/programs/${programId}/statistics`);
    return response.data;
  },
};

export default programsApi;
