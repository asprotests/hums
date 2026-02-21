import api, { type ApiResponse } from '../api';

// ===========================================
// Types
// ===========================================

export type PaymentMethod = 'EVC_PLUS' | 'ZAAD' | 'SAHAL' | 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'MOBILE_MONEY';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface PaymentMethodInfo {
  method: PaymentMethod;
  name: string;
  icon: string;
  enabled: boolean;
}

export interface PaymentSession {
  id: string;
  studentId: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  };
  invoice?: {
    id: string;
    invoiceNo: string;
    amount: number;
    dueDate: string;
    status: string;
  };
  transactions?: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  sessionId: string | null;
  studentId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: string;
  providerTxnId: string | null;
  status: PaymentStatus;
  phone: string | null;
  metadata: Record<string, any> | null;
  errorMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  sessionId?: string;
  status: PaymentStatus;
  redirectUrl?: string;
  error?: string;
  message?: string;
}

export interface StudentPaymentInfo {
  studentId: string;
  outstandingBalance: number;
  invoices: {
    id: string;
    invoiceNo: string;
    amount: number;
    dueDate: string;
    status: string;
  }[];
}

// ===========================================
// API Functions
// ===========================================

/**
 * Get available payment methods
 */
export async function getPaymentMethods(): Promise<ApiResponse<PaymentMethodInfo[]>> {
  const response = await api.get('/api/v1/payment-gateway/methods');
  return response.data;
}

/**
 * Create payment session
 */
export async function createPaymentSession(data: {
  studentId: string;
  amount: number;
  invoiceId?: string;
  currency?: string;
}): Promise<ApiResponse<PaymentSession>> {
  const response = await api.post('/api/v1/payment-gateway/session', data);
  return response.data;
}

/**
 * Get payment session
 */
export async function getPaymentSession(sessionId: string): Promise<ApiResponse<PaymentSession>> {
  const response = await api.get(`/api/v1/payment-gateway/session/${sessionId}`);
  return response.data;
}

/**
 * Cancel payment session
 */
export async function cancelPaymentSession(sessionId: string): Promise<ApiResponse<null>> {
  const response = await api.delete(`/api/v1/payment-gateway/session/${sessionId}`);
  return response.data;
}

/**
 * Initiate payment
 */
export async function initiatePayment(data: {
  amount: number;
  currency?: string;
  method: PaymentMethod;
  studentId: string;
  invoiceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<ApiResponse<PaymentResponse>> {
  const response = await api.post('/api/v1/payment-gateway/initiate', data);
  return response.data;
}

/**
 * Initiate mobile money payment
 */
export async function initiateMobileMoneyPayment(data: {
  sessionId: string;
  phone: string;
  provider: 'EVC_PLUS' | 'ZAAD' | 'SAHAL';
}): Promise<ApiResponse<PaymentResponse>> {
  const response = await api.post('/api/v1/payment-gateway/mobile-money', data);
  return response.data;
}

/**
 * Verify payment session status
 */
export async function verifyPayment(sessionId: string): Promise<ApiResponse<{
  status: PaymentStatus;
  completedAt?: string;
}>> {
  const response = await api.get(`/api/v1/payment-gateway/verify/${sessionId}`);
  return response.data;
}

/**
 * Get transaction details
 */
export async function getTransaction(transactionId: string): Promise<ApiResponse<PaymentTransaction>> {
  const response = await api.get(`/api/v1/payment-gateway/transaction/${transactionId}`);
  return response.data;
}

/**
 * Check transaction status
 */
export async function checkTransactionStatus(transactionId: string): Promise<ApiResponse<{
  status: PaymentStatus;
  transaction?: PaymentTransaction;
}>> {
  const response = await api.get(`/api/v1/payment-gateway/transaction/${transactionId}/status`);
  return response.data;
}

/**
 * Get transactions by invoice
 */
export async function getTransactionsByInvoice(invoiceId: string): Promise<ApiResponse<PaymentTransaction[]>> {
  const response = await api.get(`/api/v1/payment-gateway/invoice/${invoiceId}/transactions`);
  return response.data;
}

// ===========================================
// Student Self-Service APIs
// ===========================================

/**
 * Get student payment info (for current user)
 */
export async function getMyPaymentInfo(): Promise<ApiResponse<StudentPaymentInfo | null>> {
  const response = await api.get('/api/v1/payment-gateway/my/session');
  return response.data;
}

/**
 * Student initiates payment
 */
export async function makePayment(data: {
  amount: number;
  invoiceId?: string;
  phone: string;
  provider: 'EVC_PLUS' | 'ZAAD' | 'SAHAL';
}): Promise<ApiResponse<PaymentResponse & { sessionId: string }>> {
  const response = await api.post('/api/v1/payment-gateway/my/pay', data);
  return response.data;
}

/**
 * Get student's payment transactions
 */
export async function getMyTransactions(params?: {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
}): Promise<ApiResponse<PaymentTransaction[]>> {
  const response = await api.get('/api/v1/payment-gateway/my/transactions', { params });
  return response.data;
}

export const paymentGatewayApi = {
  getPaymentMethods,
  createPaymentSession,
  getPaymentSession,
  cancelPaymentSession,
  initiatePayment,
  initiateMobileMoneyPayment,
  verifyPayment,
  getTransaction,
  checkTransactionStatus,
  getTransactionsByInvoice,
  getMyPaymentInfo,
  makePayment,
  getMyTransactions,
};
