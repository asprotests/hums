import api, { type ApiResponse } from '../api';

// ===========================================
// Types
// ===========================================

export interface SMSLog {
  id: string;
  to: string;
  message: string;
  template: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  messageId: string | null;
  provider: string | null;
  error: string | null;
  cost: number | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface SMSBalance {
  balance: number;
  currency: string;
}

export interface SMSStats {
  today: number;
  thisMonth: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  deliveredAt?: string;
  error?: string;
}

export type OTPPurpose = 'LOGIN' | 'PASSWORD_RESET' | 'VERIFY_PHONE' | 'VERIFY_EMAIL' | 'PAYMENT';

export type SMSTemplate =
  | 'otp'
  | 'payment-received'
  | 'payment-reminder'
  | 'book-overdue'
  | 'leave-approved'
  | 'leave-rejected'
  | 'grade-published'
  | 'class-cancelled'
  | 'fee-due'
  | 'registration-reminder'
  | 'custom';

// ===========================================
// API Functions
// ===========================================

/**
 * Send a single SMS
 */
export async function sendSMS(data: {
  to: string;
  message: string;
  template?: SMSTemplate;
  data?: Record<string, any>;
}): Promise<ApiResponse<SMSResult>> {
  const response = await api.post('/api/v1/sms/send', data);
  return response.data;
}

/**
 * Send bulk SMS
 */
export async function sendBulkSMS(data: {
  recipients: string[];
  message: string;
  template?: SMSTemplate;
  data?: Record<string, any>;
}): Promise<ApiResponse<{ results: SMSResult[]; successful: number; failed: number }>> {
  const response = await api.post('/api/v1/sms/send-bulk', data);
  return response.data;
}

/**
 * Send OTP code
 */
export async function sendOTP(data: {
  phone: string;
  purpose: OTPPurpose;
}): Promise<ApiResponse<{ sent: boolean }>> {
  const response = await api.post('/api/v1/sms/send-otp', data);
  return response.data;
}

/**
 * Verify OTP code
 */
export async function verifyOTP(data: {
  phone: string;
  code: string;
  purpose: OTPPurpose;
}): Promise<ApiResponse<{ verified: boolean; error?: string }>> {
  const response = await api.post('/api/v1/sms/verify-otp', data);
  return response.data;
}

/**
 * Get SMS balance
 */
export async function getBalance(): Promise<ApiResponse<SMSBalance>> {
  const response = await api.get('/api/v1/sms/balance');
  return response.data;
}

/**
 * Get SMS statistics
 */
export async function getStats(): Promise<ApiResponse<SMSStats>> {
  const response = await api.get('/api/v1/sms/stats');
  return response.data;
}

/**
 * Get SMS delivery status
 */
export async function getDeliveryStatus(messageId: string): Promise<ApiResponse<DeliveryStatus>> {
  const response = await api.get(`/api/v1/sms/status/${messageId}`);
  return response.data;
}

/**
 * Get SMS logs
 */
export async function getLogs(params?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  phone?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<SMSLog[]>> {
  const response = await api.get('/api/v1/sms/logs', { params });
  return response.data;
}

export const smsApi = {
  sendSMS,
  sendBulkSMS,
  sendOTP,
  verifyOTP,
  getBalance,
  getStats,
  getDeliveryStatus,
  getLogs,
};
