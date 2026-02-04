import api, { type ApiResponse } from '../api';

export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoicePayment {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  student?: {
    id: string;
    studentId: string;
    user?: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email?: string;
    };
    program?: {
      code: string;
      name: string;
    };
  };
  semesterId?: string;
  semester?: {
    id: string;
    name: string;
    academicYear?: {
      id: string;
      name: string;
    };
  };
  amount: number;
  totalPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: string;
  description?: string;
  breakdown?: {
    tuitionFee: number;
    registrationFee: number;
    libraryFee: number;
    labFee: number;
    otherFees?: { name: string; amount: number }[];
  };
  payments?: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  studentId?: string;
  semesterId?: string;
  status?: InvoiceStatus;
  search?: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GenerateInvoiceInput {
  studentId: string;
  semesterId: string;
  feeStructureId?: string;
  description?: string;
  dueDate?: string;
}

export interface GenerateBulkInvoicesInput {
  semesterId: string;
  programId?: string;
  dueDate?: string;
}

export interface BulkInvoiceResult {
  generated: number;
  skipped: number;
  errors: number;
  details: {
    studentId: string;
    status: 'created' | 'skipped' | 'error';
    invoiceNo?: string;
    error?: string;
  }[];
}

export interface VoidInvoiceInput {
  reason: string;
}

interface PaginatedApiResponse {
  success: boolean;
  data: Invoice[];
  pagination: PaginatedInvoices['pagination'];
  message?: string;
}

export const invoicesApi = {
  getInvoices: async (filters: InvoiceFilters = {}): Promise<ApiResponse<PaginatedInvoices>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.semesterId) params.append('semesterId', filters.semesterId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/invoices?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getInvoiceById: async (id: string): Promise<ApiResponse<Invoice>> => {
    const response = await api.get<ApiResponse<Invoice>>(`/api/v1/invoices/${id}`);
    return response.data;
  },

  getInvoicesByStudent: async (studentId: string): Promise<ApiResponse<Invoice[]>> => {
    const response = await api.get<ApiResponse<Invoice[]>>(`/api/v1/invoices/student/${studentId}`);
    return response.data;
  },

  getOutstandingInvoices: async (): Promise<ApiResponse<Invoice[]>> => {
    const response = await api.get<ApiResponse<Invoice[]>>('/api/v1/invoices/outstanding');
    return response.data;
  },

  getOverdueInvoices: async (): Promise<ApiResponse<Invoice[]>> => {
    const response = await api.get<ApiResponse<Invoice[]>>('/api/v1/invoices/overdue');
    return response.data;
  },

  generateInvoice: async (data: GenerateInvoiceInput): Promise<ApiResponse<Invoice>> => {
    const response = await api.post<ApiResponse<Invoice>>('/api/v1/invoices/generate', data);
    return response.data;
  },

  generateBulkInvoices: async (data: GenerateBulkInvoicesInput): Promise<ApiResponse<BulkInvoiceResult>> => {
    const response = await api.post<ApiResponse<BulkInvoiceResult>>('/api/v1/invoices/generate-bulk', data);
    return response.data;
  },

  voidInvoice: async (id: string, data: VoidInvoiceInput): Promise<ApiResponse<Invoice>> => {
    const response = await api.patch<ApiResponse<Invoice>>(`/api/v1/invoices/${id}/void`, data);
    return response.data;
  },
};

export default invoicesApi;
