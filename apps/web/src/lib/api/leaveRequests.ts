import api, { type ApiResponse } from '../api';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  documentUrl: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approverRemarks: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
    department: {
      id: string;
      name: string;
    } | null;
  };
  leaveType: {
    id: string;
    name: string;
    nameLocal: string | null;
    isPaid: boolean;
    requiresDocument: boolean;
  };
  approver?: {
    firstName: string;
    lastName: string;
  } | null;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequestFilters {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateLeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
}

export interface ApproveRejectInput {
  remarks?: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  available: number;
  pending: number;
  leaveType: {
    id: string;
    name: string;
    nameLocal: string | null;
    isPaid: boolean;
  };
}

export interface AllocateLeaveInput {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  days: number;
}

export interface CarryForwardInput {
  year: number;
}

export interface PaginatedLeaveRequests {
  data: LeaveRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedApiResponse {
  success: boolean;
  data: LeaveRequest[];
  pagination: PaginatedLeaveRequests['pagination'];
  message?: string;
}

export const leaveRequestsApi = {
  getRequests: async (filters: LeaveRequestFilters = {}): Promise<ApiResponse<PaginatedLeaveRequests>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.leaveTypeId) params.append('leaveTypeId', filters.leaveTypeId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<PaginatedApiResponse>(
      `/api/v1/leave-requests?${params.toString()}`
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

  getRequestById: async (id: string): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.get<ApiResponse<LeaveRequest>>(`/api/v1/leave-requests/${id}`);
    return response.data;
  },

  createRequest: async (data: CreateLeaveRequestInput): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>('/api/v1/leave-requests', data);
    return response.data;
  },

  cancelRequest: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/leave-requests/${id}`);
    return response.data;
  },

  approveRequest: async (id: string, data?: ApproveRejectInput): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/api/v1/leave-requests/${id}/approve`, data);
    return response.data;
  },

  rejectRequest: async (id: string, data: ApproveRejectInput): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/api/v1/leave-requests/${id}/reject`, data);
    return response.data;
  },

  getPendingApprovals: async (departmentId?: string): Promise<ApiResponse<LeaveRequest[]>> => {
    const params = new URLSearchParams();
    if (departmentId) params.append('departmentId', departmentId);
    const response = await api.get<ApiResponse<LeaveRequest[]>>(
      `/api/v1/leave-requests/pending?${params.toString()}`
    );
    return response.data;
  },

  getEmployeeRequests: async (employeeId: string, year?: number): Promise<ApiResponse<LeaveRequest[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<LeaveRequest[]>>(
      `/api/v1/leave-requests/employee/${employeeId}?${params.toString()}`
    );
    return response.data;
  },

  getEmployeeBalances: async (employeeId: string, year?: number): Promise<ApiResponse<LeaveBalance[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<LeaveBalance[]>>(
      `/api/v1/leave-requests/balance/${employeeId}?${params.toString()}`
    );
    return response.data;
  },

  allocateLeave: async (data: AllocateLeaveInput): Promise<ApiResponse<LeaveBalance>> => {
    const response = await api.post<ApiResponse<LeaveBalance>>('/api/v1/leave-requests/allocate', data);
    return response.data;
  },

  carryForwardLeaves: async (data: CarryForwardInput): Promise<ApiResponse<{ processed: number }>> => {
    const response = await api.post<ApiResponse<{ processed: number }>>('/api/v1/leave-requests/carry-forward', data);
    return response.data;
  },

  getLeaveCalendar: async (month: number, year: number, departmentId?: string): Promise<ApiResponse<LeaveRequest[]>> => {
    const params = new URLSearchParams();
    params.append('month', String(month));
    params.append('year', String(year));
    if (departmentId) params.append('departmentId', departmentId);
    const response = await api.get<ApiResponse<LeaveRequest[]>>(
      `/api/v1/leave-requests/calendar?${params.toString()}`
    );
    return response.data;
  },
};

export default leaveRequestsApi;
