import api, { type ApiResponse } from '../api';

export interface LeaveType {
  id: string;
  name: string;
  nameLocal: string | null;
  type: string;
  daysPerYear: number;
  carryForward: boolean;
  maxCarryDays: number;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypeInput {
  name: string;
  nameLocal?: string;
  type: string;
  daysPerYear: number;
  carryForward?: boolean;
  maxCarryDays?: number;
  requiresDocument?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
}

export interface UpdateLeaveTypeInput {
  name?: string;
  nameLocal?: string;
  type?: string;
  daysPerYear?: number;
  carryForward?: boolean;
  maxCarryDays?: number;
  requiresDocument?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
}

export const leaveTypesApi = {
  getLeaveTypes: async (includeInactive = false): Promise<ApiResponse<LeaveType[]>> => {
    const response = await api.get<ApiResponse<LeaveType[]>>(
      `/api/v1/leave-types?includeInactive=${includeInactive}`
    );
    return response.data;
  },

  getLeaveTypeById: async (id: string): Promise<ApiResponse<LeaveType>> => {
    const response = await api.get<ApiResponse<LeaveType>>(`/api/v1/leave-types/${id}`);
    return response.data;
  },

  createLeaveType: async (data: CreateLeaveTypeInput): Promise<ApiResponse<LeaveType>> => {
    const response = await api.post<ApiResponse<LeaveType>>('/api/v1/leave-types', data);
    return response.data;
  },

  updateLeaveType: async (id: string, data: UpdateLeaveTypeInput): Promise<ApiResponse<LeaveType>> => {
    const response = await api.patch<ApiResponse<LeaveType>>(`/api/v1/leave-types/${id}`, data);
    return response.data;
  },

  initializeDefaults: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/api/v1/leave-types/initialize');
    return response.data;
  },
};

export default leaveTypesApi;
