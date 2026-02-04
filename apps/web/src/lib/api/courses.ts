import api, { type ApiResponse } from '../api';

// ============ Types ============

export interface Course {
  id: string;
  name: string;
  nameLocal?: string;
  code: string;
  credits: number;
  description?: string;
  department?: {
    id: string;
    name: string;
    code: string;
    faculty?: {
      id: string;
      name: string;
    };
  };
  prerequisites: PrerequisiteCourse[];
  prerequisiteFor?: PrerequisiteCourse[];
  usedInPrograms?: UsedInProgram[];
  classCount: number;
  programCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrerequisiteCourse {
  id: string;
  code: string;
  name: string;
}

export interface UsedInProgram {
  id: string;
  code: string;
  name: string;
  semester: number;
  isElective: boolean;
}

export interface ClassSummary {
  id: string;
  section: string;
  semester?: {
    id: string;
    name: string;
  };
  lecturer?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    name: string;
    building: string;
  };
  maxCapacity: number;
  enrollmentCount: number;
}

export interface PrerequisiteChain {
  course: PrerequisiteCourse;
  prerequisites: PrerequisiteNode[];
}

export interface PrerequisiteNode {
  id: string;
  code: string;
  name: string;
  prerequisites: PrerequisiteNode[];
}

export interface CourseFilters {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
}

export interface PaginatedCourses {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCourseInput {
  name: string;
  nameLocal?: string;
  code: string;
  credits: number;
  description?: string;
  departmentId: string;
  prerequisiteIds?: string[];
}

export interface UpdateCourseInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  credits?: number;
  description?: string;
  departmentId?: string;
}

export interface AddPrerequisiteResult {
  message: string;
  course: { id: string; code: string };
  prerequisite: { id: string; code: string };
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: Course[];
  pagination: PaginatedCourses['pagination'];
  message?: string;
}

// ============ Course API ============

export const coursesApi = {
  getCourses: async (filters: CourseFilters = {}): Promise<ApiResponse<PaginatedCourses>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/courses?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getCourseById: async (id: string): Promise<ApiResponse<Course>> => {
    const response = await api.get<ApiResponse<Course>>(`/api/v1/courses/${id}`);
    return response.data;
  },

  createCourse: async (data: CreateCourseInput): Promise<ApiResponse<Course>> => {
    const response = await api.post<ApiResponse<Course>>('/api/v1/courses', data);
    return response.data;
  },

  updateCourse: async (id: string, data: UpdateCourseInput): Promise<ApiResponse<Course>> => {
    const response = await api.patch<ApiResponse<Course>>(`/api/v1/courses/${id}`, data);
    return response.data;
  },

  deleteCourse: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/courses/${id}`);
    return response.data;
  },

  addPrerequisite: async (courseId: string, prerequisiteId: string): Promise<ApiResponse<AddPrerequisiteResult>> => {
    const response = await api.post<ApiResponse<AddPrerequisiteResult>>(
      `/api/v1/courses/${courseId}/prerequisites`,
      { prerequisiteId }
    );
    return response.data;
  },

  removePrerequisite: async (courseId: string, prerequisiteId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/courses/${courseId}/prerequisites/${prerequisiteId}`);
    return response.data;
  },

  getClasses: async (courseId: string, semesterId?: string): Promise<ApiResponse<ClassSummary[]>> => {
    const params = new URLSearchParams();
    if (semesterId) params.append('semesterId', semesterId);

    const url = `/api/v1/courses/${courseId}/classes${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ApiResponse<ClassSummary[]>>(url);
    return response.data;
  },

  getPrerequisiteChain: async (courseId: string): Promise<ApiResponse<PrerequisiteChain>> => {
    const response = await api.get<ApiResponse<PrerequisiteChain>>(`/api/v1/courses/${courseId}/prerequisites-chain`);
    return response.data;
  },
};

export default coursesApi;
