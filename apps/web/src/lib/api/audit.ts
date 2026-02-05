import api, { type ApiResponse } from '../api';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditStatistics {
  totalLogs: number;
  last24Hours: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
}

// Audit action types for display
export const AUDIT_ACTIONS = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  LOGIN_FAILED: 'Login Failed',
  PASSWORD_CHANGE: 'Password Change',
  PASSWORD_RESET: 'Password Reset',
  EXPORT: 'Export',
  IMPORT: 'Import',
  APPROVE: 'Approve',
  REJECT: 'Reject',
} as const;

// Resource types for display
export const AUDIT_RESOURCES = {
  User: 'User',
  Student: 'Student',
  Employee: 'Employee',
  Faculty: 'Faculty',
  Department: 'Department',
  Program: 'Program',
  Course: 'Course',
  Invoice: 'Invoice',
  Payment: 'Payment',
  Role: 'Role',
  Admission: 'Admission',
  SystemConfig: 'System Config',
} as const;

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(filters: AuditFilters = {}): Promise<PaginatedAuditLogs> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.action) params.append('action', filters.action);
  if (filters.resource) params.append('resource', filters.resource);
  if (filters.resourceId) params.append('resourceId', filters.resourceId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);

  const response = await api.get<ApiResponse<AuditLog[]>>(`/api/v1/audit-logs?${params.toString()}`);
  return response.data as unknown as PaginatedAuditLogs;
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(dateFrom?: string, dateTo?: string): Promise<AuditStatistics> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const response = await api.get<ApiResponse<AuditStatistics>>(`/api/v1/audit-logs/statistics?${params.toString()}`);
  return response.data.data!;
}

/**
 * Get entity history
 */
export async function getEntityHistory(resource: string, resourceId: string): Promise<AuditLog[]> {
  const response = await api.get<ApiResponse<AuditLog[]>>(`/api/v1/audit-logs/entity/${resource}/${resourceId}`);
  return response.data.data!;
}

/**
 * Get user activity
 */
export async function getUserActivity(userId: string, dateFrom?: string, dateTo?: string): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const response = await api.get<ApiResponse<AuditLog[]>>(`/api/v1/audit-logs/user/${userId}?${params.toString()}`);
  return response.data.data!;
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogs(filters: AuditFilters = {}): Promise<Blob> {
  const params = new URLSearchParams();

  if (filters.userId) params.append('userId', filters.userId);
  if (filters.action) params.append('action', filters.action);
  if (filters.resource) params.append('resource', filters.resource);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);

  const response = await api.get(`/api/v1/audit-logs/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}
