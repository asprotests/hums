import api, { type ApiResponse } from '../api';

export interface RecentPayment {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  studentName: string;
  createdAt: string;
}

export interface CollectionByMethod {
  method: string;
  total: number;
}

export interface OverdueByProgram {
  programId: string;
  program: string;
  count: number;
  amount: number;
}

export interface FinanceDashboard {
  totalCollectedToday: number;
  paymentsCountToday: number;
  totalCollectedThisMonth: number;
  paymentsCountThisMonth: number;
  totalOutstanding: number;
  totalOverdue: number;
  recentPayments: RecentPayment[];
  collectionByMethod: CollectionByMethod[];
  overdueByProgram: OverdueByProgram[];
}

export interface DailyPayment {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  studentId: string;
  studentName: string;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  totalAmount: number;
  totalPayments: number;
  byMethod: CollectionByMethod[];
  payments: DailyPayment[];
}

export interface CollectionByDay {
  date: string;
  total: number;
}

export interface CollectionReport {
  dateFrom: string;
  dateTo: string;
  totalAmount: number;
  paymentCount: number;
  byMethod: CollectionByMethod[];
  byDate: CollectionByDay[];
}

export interface OutstandingInvoice {
  invoiceId: string;
  invoiceNo: string;
  studentId: string;
  studentIdNo: string;
  studentName: string;
  email?: string;
  program?: string;
  invoiceAmount: number;
  totalPaid: number;
  balance: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export interface OutstandingReport {
  summary: {
    totalInvoices: number;
    totalAmount: number;
    totalPaid: number;
    totalBalance: number;
    overdueCount: number;
    overdueAmount: number;
  };
  invoices: OutstandingInvoice[];
}

export const financeApi = {
  getDashboard: async (): Promise<ApiResponse<FinanceDashboard>> => {
    const response = await api.get<ApiResponse<FinanceDashboard>>('/api/v1/finance/dashboard');
    return response.data;
  },

  getDailySummary: async (date?: string): Promise<ApiResponse<DailySummary>> => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get<ApiResponse<DailySummary>>(`/api/v1/finance/reports/daily-summary${params}`);
    return response.data;
  },

  getCollectionReport: async (from: string, to: string): Promise<ApiResponse<CollectionReport>> => {
    const response = await api.get<ApiResponse<CollectionReport>>(
      `/api/v1/finance/reports/collection?from=${from}&to=${to}`
    );
    return response.data;
  },

  getOutstandingReport: async (): Promise<ApiResponse<OutstandingReport>> => {
    const response = await api.get<ApiResponse<OutstandingReport>>('/api/v1/finance/reports/outstanding');
    return response.data;
  },
};

export default financeApi;
