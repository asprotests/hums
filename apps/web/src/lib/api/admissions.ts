import api, { type ApiResponse } from '../api';

export type AdmissionStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
export type Gender = 'MALE' | 'FEMALE';

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  status: AdmissionStatus;
  personalInfo: {
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string;
    gender: Gender;
    phone: string;
    email: string;
    address?: string;
    city?: string;
    district?: string;
    nationality: string;
  };
  emergencyContact: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  academicInfo: {
    previousEducationLevel: string;
    previousSchoolName?: string;
    graduationYear?: number;
  };
  program: {
    id: string;
    code: string;
    name: string;
    type: string;
    department?: {
      id: string;
      name: string;
      faculty?: {
        id: string;
        name: string;
      };
    };
  };
  review: {
    reviewedAt?: string;
    remarks?: string;
    rejectionReason?: string;
  };
  enrollment: {
    enrolledAt?: string;
  };
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdmissionStatus;
  programId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedApplications {
  data: AdmissionApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateApplicationInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  address?: string;
  city?: string;
  district?: string;
  programId: string;
  previousEducationLevel: 'secondary' | 'diploma' | 'bachelor' | 'master';
  previousSchoolName?: string;
  graduationYear?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface UpdateApplicationInput extends Partial<CreateApplicationInput> {}

export interface ReviewApplicationInput {
  status: AdmissionStatus;
  statusNote?: string;
}

export interface AdmissionStatistics {
  total: number;
  byStatus: Record<AdmissionStatus, number>;
  byProgram: Array<{
    program: {
      id: string;
      name: string;
      code: string;
    };
    count: number;
  }>;
  monthlyTrend: Array<{
    month: number;
    count: number;
  }>;
}

interface PaginatedApiResponse {
  success: boolean;
  data: AdmissionApplication[];
  pagination: PaginatedApplications['pagination'];
  message?: string;
}

export const admissionsApi = {
  getApplications: async (filters: ApplicationFilters = {}): Promise<ApiResponse<PaginatedApplications>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.programId) params.append('programId', filters.programId);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/admissions?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getApplicationById: async (id: string): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.get<ApiResponse<AdmissionApplication>>(`/api/v1/admissions/${id}`);
    return response.data;
  },

  createApplication: async (data: CreateApplicationInput): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.post<ApiResponse<AdmissionApplication>>('/api/v1/admissions', data);
    return response.data;
  },

  updateApplication: async (id: string, data: UpdateApplicationInput): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.patch<ApiResponse<AdmissionApplication>>(`/api/v1/admissions/${id}`, data);
    return response.data;
  },

  reviewApplication: async (id: string, data: ReviewApplicationInput): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.patch<ApiResponse<AdmissionApplication>>(`/api/v1/admissions/${id}/review`, data);
    return response.data;
  },

  approveApplication: async (id: string): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.patch<ApiResponse<AdmissionApplication>>(`/api/v1/admissions/${id}/approve`);
    return response.data;
  },

  rejectApplication: async (id: string, reason: string): Promise<ApiResponse<AdmissionApplication>> => {
    const response = await api.patch<ApiResponse<AdmissionApplication>>(`/api/v1/admissions/${id}/reject`, { reason });
    return response.data;
  },

  enrollStudent: async (id: string): Promise<ApiResponse<{ application: AdmissionApplication; student: { id: string; studentId: string }; tempPassword: string }>> => {
    const response = await api.post<ApiResponse<{ application: AdmissionApplication; student: { id: string; studentId: string }; tempPassword: string }>>(`/api/v1/admissions/${id}/enroll`);
    return response.data;
  },

  getStatistics: async (): Promise<ApiResponse<AdmissionStatistics>> => {
    const response = await api.get<ApiResponse<AdmissionStatistics>>('/api/v1/admissions/statistics');
    return response.data;
  },
};

export default admissionsApi;
