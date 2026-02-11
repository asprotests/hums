import api, { type ApiResponse } from '../api';

export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';

export interface PayrollItem {
  id: string;
  name: string;
  type: 'ALLOWANCE' | 'DEDUCTION';
  calculationType: 'FIXED' | 'PERCENTAGE';
  value: number;
  amount: number;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  processedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  employee: {
    id: string;
    employeeId: string;
    position: string;
    user: {
      firstName: string;
      lastName: string;
    };
    department: {
      id: string;
      name: string;
    } | null;
    bankName: string | null;
    bankAccount: string | null;
    mobileWallet: string | null;
  };
  items: PayrollItem[];
  approvedBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

export interface PayrollFilters {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  status?: PayrollStatus;
  employeeId?: string;
  departmentId?: string;
}

export interface ProcessPayrollInput {
  month: number;
  year: number;
  departmentId?: string;
}

export interface BulkMarkPaidInput {
  payrollIds: string[];
}

export interface PayrollProcessResult {
  processed: number;
  failed: number;
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
}

export interface BulkMarkPaidResult {
  success: number;
  failed: number;
  errors: Array<{
    payrollId: string;
    error: string;
  }>;
}

export interface PayrollReport {
  month: number;
  year: number;
  totals: {
    totalBaseSalary: number;
    totalGrossSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    totalNetSalary: number;
    employeeCount: number;
  };
  byDepartment: Record<string, {
    employees: Payroll[];
    total: number;
  }>;
  byStatus: {
    draft: number;
    processed: number;
    approved: number;
    paid: number;
  };
  payrolls: Payroll[];
}

export interface BankFile {
  filename: string;
  content: string;
  recordCount: number;
  totalAmount: number;
}

export interface PaginatedPayrolls {
  data: Payroll[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedApiResponse {
  success: boolean;
  data: Payroll[];
  pagination: PaginatedPayrolls['pagination'];
  message?: string;
}

export const payrollApi = {
  getPayrolls: async (filters: PayrollFilters = {}): Promise<ApiResponse<PaginatedPayrolls>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.month) params.append('month', String(filters.month));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.status) params.append('status', filters.status);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);

    const response = await api.get<PaginatedApiResponse>(
      `/api/v1/payroll?${params.toString()}`
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

  getPayrollById: async (id: string): Promise<ApiResponse<Payroll>> => {
    const response = await api.get<ApiResponse<Payroll>>(`/api/v1/payroll/${id}`);
    return response.data;
  },

  processPayroll: async (data: ProcessPayrollInput): Promise<ApiResponse<PayrollProcessResult>> => {
    const response = await api.post<ApiResponse<PayrollProcessResult>>('/api/v1/payroll/process', data);
    return response.data;
  },

  approvePayroll: async (id: string): Promise<ApiResponse<Payroll>> => {
    const response = await api.post<ApiResponse<Payroll>>(`/api/v1/payroll/${id}/approve`);
    return response.data;
  },

  markAsPaid: async (id: string): Promise<ApiResponse<Payroll>> => {
    const response = await api.post<ApiResponse<Payroll>>(`/api/v1/payroll/${id}/mark-paid`);
    return response.data;
  },

  bulkMarkAsPaid: async (data: BulkMarkPaidInput): Promise<ApiResponse<BulkMarkPaidResult>> => {
    const response = await api.post<ApiResponse<BulkMarkPaidResult>>('/api/v1/payroll/bulk-mark-paid', data);
    return response.data;
  },

  getEmployeePayrolls: async (employeeId: string, year?: number): Promise<ApiResponse<Payroll[]>> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const response = await api.get<ApiResponse<Payroll[]>>(
      `/api/v1/payroll/employee/${employeeId}?${params.toString()}`
    );
    return response.data;
  },

  getPayrollReport: async (month: number, year: number): Promise<ApiResponse<PayrollReport>> => {
    const response = await api.get<ApiResponse<PayrollReport>>(
      `/api/v1/payroll/report?month=${month}&year=${year}`
    );
    return response.data;
  },

  getBankFile: async (month: number, year: number): Promise<ApiResponse<BankFile>> => {
    const response = await api.get<ApiResponse<BankFile>>(
      `/api/v1/payroll/bank-file?month=${month}&year=${year}`
    );
    return response.data;
  },
};

export default payrollApi;
