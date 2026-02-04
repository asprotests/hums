import api, { type ApiResponse } from '../api';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'EVC_PLUS';

export interface Payment {
  id: string;
  receiptNo: string;
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
  invoiceId?: string;
  invoice?: {
    id: string;
    invoiceNo: string;
    amount: number;
    status: string;
  };
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  receivedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  isVoided: boolean;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  studentId?: string;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedPayments {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecordPaymentInput {
  studentId: string;
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface VoidPaymentInput {
  reason: string;
}

export interface Receipt {
  receiptNo: string;
  date: string;
  student: {
    id: string;
    studentId: string;
    name: string;
    email?: string;
    program?: {
      id: string;
      code: string;
      name: string;
    };
  };
  amount: number;
  method: PaymentMethod;
  reference?: string;
  invoice?: {
    id: string;
    invoiceNo: string;
    amount: number;
  };
  outstandingBalance: number;
  notes?: string;
}

interface PaginatedApiResponse {
  success: boolean;
  data: Payment[];
  pagination: PaginatedPayments['pagination'];
  message?: string;
}

export const paymentsApi = {
  getPayments: async (filters: PaymentFilters = {}): Promise<ApiResponse<PaginatedPayments>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.method) params.append('method', filters.method);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/payments?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getPaymentById: async (id: string): Promise<ApiResponse<Payment>> => {
    const response = await api.get<ApiResponse<Payment>>(`/api/v1/payments/${id}`);
    return response.data;
  },

  getPaymentsByStudent: async (studentId: string): Promise<ApiResponse<Payment[]>> => {
    const response = await api.get<ApiResponse<Payment[]>>(`/api/v1/payments/student/${studentId}`);
    return response.data;
  },

  recordPayment: async (data: RecordPaymentInput): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>('/api/v1/payments', data);
    return response.data;
  },

  voidPayment: async (id: string, data: VoidPaymentInput): Promise<ApiResponse<Payment>> => {
    const response = await api.patch<ApiResponse<Payment>>(`/api/v1/payments/${id}/void`, data);
    return response.data;
  },

  getReceipt: async (id: string): Promise<ApiResponse<Receipt>> => {
    const response = await api.get<ApiResponse<Receipt>>(`/api/v1/payments/${id}/receipt`);
    return response.data;
  },
};

export default paymentsApi;
