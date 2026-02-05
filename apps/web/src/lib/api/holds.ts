import api, { type ApiResponse } from '../api';

export type HoldType = 'FINANCIAL' | 'ACADEMIC' | 'LIBRARY' | 'DISCIPLINARY' | 'ADMINISTRATIVE';

export interface Hold {
  id: string;
  studentId: string;
  type: HoldType;
  reason: string;
  placedById: string;
  placedAt: string;
  releasedAt: string | null;
  releasedById: string | null;
  blocksRegistration: boolean;
  blocksGrades: boolean;
  blocksTranscript: boolean;
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
  };
  placedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  releasedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateHoldInput {
  studentId: string;
  type: HoldType;
  reason: string;
  blocksRegistration?: boolean;
  blocksGrades?: boolean;
  blocksTranscript?: boolean;
}

export interface UpdateHoldInput {
  reason?: string;
  blocksRegistration?: boolean;
  blocksGrades?: boolean;
  blocksTranscript?: boolean;
}

export interface HoldFilters {
  studentId?: string;
  type?: HoldType;
  isActive?: boolean;
}

export interface HoldCheck {
  hasHold: boolean;
  holds: Array<{ type: HoldType; reason: string }>;
}

export const holdsApi = {
  getAll: async (filters?: HoldFilters): Promise<Hold[]> => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.type) params.append('type', filters.type);
    if (typeof filters?.isActive === 'boolean') params.append('isActive', String(filters.isActive));

    const response = await api.get<ApiResponse<Hold[]>>(`/api/v1/holds?${params.toString()}`);
    return response.data.data!;
  },

  getById: async (id: string): Promise<Hold> => {
    const response = await api.get<ApiResponse<Hold>>(`/api/v1/holds/${id}`);
    return response.data.data!;
  },

  getStudentHolds: async (studentId: string): Promise<Hold[]> => {
    const response = await api.get<ApiResponse<Hold[]>>(`/api/v1/holds/student/${studentId}`);
    return response.data.data!;
  },

  checkRegistrationHold: async (studentId: string): Promise<HoldCheck> => {
    const response = await api.get<ApiResponse<HoldCheck>>(`/api/v1/holds/student/${studentId}/registration-check`);
    return response.data.data!;
  },

  create: async (data: CreateHoldInput): Promise<Hold> => {
    const response = await api.post<ApiResponse<Hold>>('/api/v1/holds', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateHoldInput): Promise<Hold> => {
    const response = await api.patch<ApiResponse<Hold>>(`/api/v1/holds/${id}`, data);
    return response.data.data!;
  },

  release: async (id: string): Promise<Hold> => {
    const response = await api.post<ApiResponse<Hold>>(`/api/v1/holds/${id}/release`);
    return response.data.data!;
  },
};
