import api, { type ApiResponse } from '../api';

// ============ Types ============

export interface Faculty {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  dean?: {
    id: string;
    name: string;
    email: string;
  };
  departmentCount: number;
  createdAt: string;
  updatedAt: string;
  departments?: DepartmentSummary[];
}

export interface DepartmentSummary {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  programCount: number;
  courseCount: number;
}

export interface FacultyStatistics {
  id: string;
  name: string;
  departmentCount: number;
  programCount: number;
  courseCount: number;
  studentCount: number;
  employeeCount: number;
}

export interface FacultyFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedFaculties {
  data: Faculty[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateFacultyInput {
  name: string;
  nameLocal?: string;
  code: string;
  deanId?: string;
}

export interface UpdateFacultyInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  deanId?: string | null;
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: Faculty[];
  pagination: PaginatedFaculties['pagination'];
  message?: string;
}

// ============ Faculty API ============

export const facultiesApi = {
  getFaculties: async (filters: FacultyFilters = {}): Promise<ApiResponse<PaginatedFaculties>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/faculties?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getFacultyById: async (id: string): Promise<ApiResponse<Faculty>> => {
    const response = await api.get<ApiResponse<Faculty>>(`/api/v1/faculties/${id}`);
    return response.data;
  },

  createFaculty: async (data: CreateFacultyInput): Promise<ApiResponse<Faculty>> => {
    const response = await api.post<ApiResponse<Faculty>>('/api/v1/faculties', data);
    return response.data;
  },

  updateFaculty: async (id: string, data: UpdateFacultyInput): Promise<ApiResponse<Faculty>> => {
    const response = await api.patch<ApiResponse<Faculty>>(`/api/v1/faculties/${id}`, data);
    return response.data;
  },

  deleteFaculty: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/faculties/${id}`);
    return response.data;
  },

  getDepartments: async (facultyId: string): Promise<ApiResponse<DepartmentSummary[]>> => {
    const response = await api.get<ApiResponse<DepartmentSummary[]>>(`/api/v1/faculties/${facultyId}/departments`);
    return response.data;
  },

  getStatistics: async (facultyId: string): Promise<ApiResponse<FacultyStatistics>> => {
    const response = await api.get<ApiResponse<FacultyStatistics>>(`/api/v1/faculties/${facultyId}/statistics`);
    return response.data;
  },
};

export default facultiesApi;
