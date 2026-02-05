import api, { type ApiResponse } from '../api';

export type RegistrationPeriodType = 'REGULAR' | 'LATE' | 'DROP_ADD';

export interface RegistrationPeriod {
  id: string;
  semesterId: string;
  type: RegistrationPeriodType;
  startDate: string;
  endDate: string;
  lateFee: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  semester?: {
    id: string;
    name: string;
    academicYearId: string;
  };
}

export interface CreateRegistrationPeriodInput {
  semesterId: string;
  type: RegistrationPeriodType;
  startDate: string;
  endDate: string;
  lateFee?: number;
}

export interface UpdateRegistrationPeriodInput {
  type?: RegistrationPeriodType;
  startDate?: string;
  endDate?: string;
  lateFee?: number | null;
  isActive?: boolean;
}

export interface RegistrationPeriodFilters {
  semesterId?: string;
  type?: RegistrationPeriodType;
  isActive?: boolean;
}

export interface RegistrationStatus {
  semester: {
    id: string;
    name: string;
  } | null;
  isOpen: boolean;
  period?: {
    id: string;
    type: RegistrationPeriodType;
    endDate: string;
    lateFee: number | null;
  };
  message: string;
}

export const registrationPeriodsApi = {
  getAll: async (filters?: RegistrationPeriodFilters): Promise<RegistrationPeriod[]> => {
    const params = new URLSearchParams();
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    if (filters?.type) params.append('type', filters.type);
    if (typeof filters?.isActive === 'boolean') params.append('isActive', String(filters.isActive));

    const response = await api.get<ApiResponse<RegistrationPeriod[]>>(
      `/api/v1/registration-periods?${params.toString()}`
    );
    return response.data.data!;
  },

  getById: async (id: string): Promise<RegistrationPeriod> => {
    const response = await api.get<ApiResponse<RegistrationPeriod>>(`/api/v1/registration-periods/${id}`);
    return response.data.data!;
  },

  getStatus: async (): Promise<RegistrationStatus> => {
    const response = await api.get<ApiResponse<RegistrationStatus>>('/api/v1/registration-periods/status');
    return response.data.data!;
  },

  create: async (data: CreateRegistrationPeriodInput): Promise<RegistrationPeriod> => {
    const response = await api.post<ApiResponse<RegistrationPeriod>>('/api/v1/registration-periods', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateRegistrationPeriodInput): Promise<RegistrationPeriod> => {
    const response = await api.patch<ApiResponse<RegistrationPeriod>>(`/api/v1/registration-periods/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/registration-periods/${id}`);
  },
};
