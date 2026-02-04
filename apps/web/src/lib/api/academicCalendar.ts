import api, { type ApiResponse } from '../api';

// ============ Types ============

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  semesterCount: number;
  createdAt: string;
  updatedAt: string;
  semesters?: Semester[];
}

export interface Semester {
  id: string;
  name: string;
  academicYearId: string;
  academicYear?: {
    id: string;
    name: string;
  };
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  isCurrent: boolean;
  classCount: number;
  enrollmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationStatus {
  isOpen: boolean;
  semester?: string;
  registrationStart?: string;
  registrationEnd?: string;
  message: string;
}

export interface CreateAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateAcademicYearInput {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateSemesterInput {
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
}

export interface UpdateSemesterInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  registrationStart?: string;
  registrationEnd?: string;
}

export interface SemesterFilters {
  academicYearId?: string;
}

// ============ Academic Year API ============

export const academicYearsApi = {
  getAcademicYears: async (): Promise<ApiResponse<AcademicYear[]>> => {
    const response = await api.get<ApiResponse<AcademicYear[]>>('/api/v1/academic-years');
    return response.data;
  },

  getCurrentAcademicYear: async (): Promise<ApiResponse<AcademicYear | null>> => {
    const response = await api.get<ApiResponse<AcademicYear | null>>('/api/v1/academic-years/current');
    return response.data;
  },

  getAcademicYearById: async (id: string): Promise<ApiResponse<AcademicYear>> => {
    const response = await api.get<ApiResponse<AcademicYear>>(`/api/v1/academic-years/${id}`);
    return response.data;
  },

  createAcademicYear: async (data: CreateAcademicYearInput): Promise<ApiResponse<AcademicYear>> => {
    const response = await api.post<ApiResponse<AcademicYear>>('/api/v1/academic-years', data);
    return response.data;
  },

  updateAcademicYear: async (id: string, data: UpdateAcademicYearInput): Promise<ApiResponse<AcademicYear>> => {
    const response = await api.patch<ApiResponse<AcademicYear>>(`/api/v1/academic-years/${id}`, data);
    return response.data;
  },

  deleteAcademicYear: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/academic-years/${id}`);
    return response.data;
  },

  setCurrentAcademicYear: async (id: string): Promise<ApiResponse<AcademicYear>> => {
    const response = await api.patch<ApiResponse<AcademicYear>>(`/api/v1/academic-years/${id}/set-current`);
    return response.data;
  },

  getSemesters: async (academicYearId: string): Promise<ApiResponse<Semester[]>> => {
    const response = await api.get<ApiResponse<Semester[]>>(`/api/v1/academic-years/${academicYearId}/semesters`);
    return response.data;
  },
};

// ============ Semester API ============

export const semestersApi = {
  getSemesters: async (filters: SemesterFilters = {}): Promise<ApiResponse<Semester[]>> => {
    const params = new URLSearchParams();
    if (filters.academicYearId) params.append('academicYearId', filters.academicYearId);

    const response = await api.get<ApiResponse<Semester[]>>(`/api/v1/semesters?${params.toString()}`);
    return response.data;
  },

  getCurrentSemester: async (): Promise<ApiResponse<Semester | null>> => {
    const response = await api.get<ApiResponse<Semester | null>>('/api/v1/semesters/current');
    return response.data;
  },

  getRegistrationStatus: async (): Promise<ApiResponse<RegistrationStatus>> => {
    const response = await api.get<ApiResponse<RegistrationStatus>>('/api/v1/semesters/registration-status');
    return response.data;
  },

  getSemesterById: async (id: string): Promise<ApiResponse<Semester>> => {
    const response = await api.get<ApiResponse<Semester>>(`/api/v1/semesters/${id}`);
    return response.data;
  },

  createSemester: async (data: CreateSemesterInput): Promise<ApiResponse<Semester>> => {
    const response = await api.post<ApiResponse<Semester>>('/api/v1/semesters', data);
    return response.data;
  },

  updateSemester: async (id: string, data: UpdateSemesterInput): Promise<ApiResponse<Semester>> => {
    const response = await api.patch<ApiResponse<Semester>>(`/api/v1/semesters/${id}`, data);
    return response.data;
  },

  deleteSemester: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/semesters/${id}`);
    return response.data;
  },

  setCurrentSemester: async (id: string): Promise<ApiResponse<Semester>> => {
    const response = await api.patch<ApiResponse<Semester>>(`/api/v1/semesters/${id}/set-current`);
    return response.data;
  },
};

export default { academicYearsApi, semestersApi };
