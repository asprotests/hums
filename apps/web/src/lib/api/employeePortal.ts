import api, { type ApiResponse } from '../api';
import type { LeaveBalance, LeaveRequest, CreateLeaveRequestInput } from './leaveRequests';
import type { Payroll } from './payroll';

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  position: string;
  salary: number;
  hireDate: string;
  status: string;
  bankName: string | null;
  bankAccount: string | null;
  mobileWallet: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
  department: {
    id: string;
    name: string;
    faculty: {
      id: string;
      name: string;
    };
  } | null;
}

export const employeePortalApi = {
  // Profile
  getProfile: async (): Promise<ApiResponse<EmployeeProfile>> => {
    const response = await api.get<ApiResponse<EmployeeProfile>>('/api/v1/employee/profile');
    return response.data;
  },

  // Leave Management
  getLeaveBalances: async (year?: number): Promise<ApiResponse<LeaveBalance[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<LeaveBalance[]>>(
      `/api/v1/employee/leave-balances?${params.toString()}`
    );
    return response.data;
  },

  getLeaveRequests: async (year?: number): Promise<ApiResponse<LeaveRequest[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<LeaveRequest[]>>(
      `/api/v1/employee/leave-requests?${params.toString()}`
    );
    return response.data;
  },

  submitLeaveRequest: async (data: CreateLeaveRequestInput): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>('/api/v1/employee/leave-requests', data);
    return response.data;
  },

  cancelLeaveRequest: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/employee/leave-requests/${id}`);
    return response.data;
  },

  // Payroll / Payslips
  getPayslips: async (year?: number): Promise<ApiResponse<Payroll[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<Payroll[]>>(
      `/api/v1/employee/payslips?${params.toString()}`
    );
    return response.data;
  },

  getPayslip: async (id: string): Promise<ApiResponse<Payroll>> => {
    const response = await api.get<ApiResponse<Payroll>>(`/api/v1/employee/payslips/${id}`);
    return response.data;
  },
};

export default employeePortalApi;
