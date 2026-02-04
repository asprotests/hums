import api, { type ApiResponse } from '../api';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
  permissions?: string[];
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  roleIds: string[];
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roleIds?: string[];
}

export interface BulkImportUser {
  email: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  role: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// The API returns { success, data: User[], pagination } but we need to transform it
interface PaginatedApiResponse {
  success: boolean;
  data: User[];
  pagination: PaginatedUsers['pagination'];
  message?: string;
}

export const usersApi = {
  getUsers: async (filters: UserFilters = {}): Promise<ApiResponse<PaginatedUsers>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const response = await api.get<PaginatedApiResponse>(
      `/api/v1/users?${params.toString()}`
    );
    // Transform the response to match expected format
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/api/v1/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserInput): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/api/v1/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserInput): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(`/api/v1/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/users/${id}`);
    return response.data;
  },

  activateUser: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.patch<ApiResponse<null>>(`/api/v1/users/${id}/activate`);
    return response.data;
  },

  deactivateUser: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.patch<ApiResponse<null>>(`/api/v1/users/${id}/deactivate`);
    return response.data;
  },

  bulkImport: async (users: BulkImportUser[]): Promise<ApiResponse<BulkImportResult>> => {
    const response = await api.post<ApiResponse<BulkImportResult>>('/api/v1/users/bulk-import', {
      users,
    });
    return response.data;
  },

  getUserActivity: async (
    id: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{ data: AuditLog[]; pagination: PaginatedUsers['pagination'] }>> => {
    const response = await api.get<{
      success: boolean;
      data: AuditLog[];
      pagination: PaginatedUsers['pagination'];
      message?: string;
    }>(`/api/v1/users/${id}/activity?page=${page}&limit=${limit}`);
    // Transform the response to match expected format
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },
};

export default usersApi;
