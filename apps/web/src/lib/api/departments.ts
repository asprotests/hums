import api, { type ApiResponse } from '../api';

// ============ Types ============

export interface Department {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  faculty?: {
    id: string;
    name: string;
    code: string;
  };
  hod?: {
    id: string;
    name: string;
    email: string;
  };
  programCount: number;
  courseCount: number;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
  programs?: ProgramSummary[];
  courses?: CourseSummary[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  type: string;
  studentCount: number;
}

export interface CourseSummary {
  id: string;
  name: string;
  code: string;
  credits: number;
}

export interface EmployeeSummary {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  employmentType: string;
}

export interface DepartmentStatistics {
  id: string;
  name: string;
  programCount: number;
  courseCount: number;
  studentCount: number;
  employeeCount: number;
}

export interface DepartmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  facultyId?: string;
}

export interface PaginatedDepartments {
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateDepartmentInput {
  name: string;
  nameLocal?: string;
  code: string;
  facultyId: string;
  hodId?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  facultyId?: string;
  hodId?: string | null;
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: Department[];
  pagination: PaginatedDepartments['pagination'];
  message?: string;
}

// ============ Department API ============

export const departmentsApi = {
  getDepartments: async (filters: DepartmentFilters = {}): Promise<ApiResponse<PaginatedDepartments>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/departments?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getDepartmentById: async (id: string): Promise<ApiResponse<Department>> => {
    const response = await api.get<ApiResponse<Department>>(`/api/v1/departments/${id}`);
    return response.data;
  },

  createDepartment: async (data: CreateDepartmentInput): Promise<ApiResponse<Department>> => {
    const response = await api.post<ApiResponse<Department>>('/api/v1/departments', data);
    return response.data;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentInput): Promise<ApiResponse<Department>> => {
    const response = await api.patch<ApiResponse<Department>>(`/api/v1/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/departments/${id}`);
    return response.data;
  },

  getPrograms: async (departmentId: string): Promise<ApiResponse<ProgramSummary[]>> => {
    const response = await api.get<ApiResponse<ProgramSummary[]>>(`/api/v1/departments/${departmentId}/programs`);
    return response.data;
  },

  getCourses: async (departmentId: string): Promise<ApiResponse<CourseSummary[]>> => {
    const response = await api.get<ApiResponse<CourseSummary[]>>(`/api/v1/departments/${departmentId}/courses`);
    return response.data;
  },

  getEmployees: async (departmentId: string): Promise<ApiResponse<EmployeeSummary[]>> => {
    const response = await api.get<ApiResponse<EmployeeSummary[]>>(`/api/v1/departments/${departmentId}/employees`);
    return response.data;
  },

  getStatistics: async (departmentId: string): Promise<ApiResponse<DepartmentStatistics>> => {
    const response = await api.get<ApiResponse<DepartmentStatistics>>(`/api/v1/departments/${departmentId}/statistics`);
    return response.data;
  },
};

export default departmentsApi;
