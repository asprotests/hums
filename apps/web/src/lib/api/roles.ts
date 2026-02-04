import api, { type ApiResponse } from '../api';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  userCount: number;
  permissions: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  displayName?: string;
  description?: string;
  permissionIds?: string[];
}

export interface PermissionsResponse {
  permissions: Permission[];
  grouped: Record<string, Permission[]>;
}

export const rolesApi = {
  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    const response = await api.get<ApiResponse<Role[]>>('/api/v1/roles');
    return response.data;
  },

  getRoleById: async (id: string): Promise<ApiResponse<Role>> => {
    const response = await api.get<ApiResponse<Role>>(`/api/v1/roles/${id}`);
    return response.data;
  },

  createRole: async (data: CreateRoleInput): Promise<ApiResponse<Role>> => {
    const response = await api.post<ApiResponse<Role>>('/api/v1/roles', data);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleInput): Promise<ApiResponse<Role>> => {
    const response = await api.patch<ApiResponse<Role>>(`/api/v1/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/roles/${id}`);
    return response.data;
  },

  getPermissions: async (): Promise<ApiResponse<PermissionsResponse>> => {
    const response = await api.get<ApiResponse<PermissionsResponse>>('/api/v1/roles/permissions');
    return response.data;
  },
};

export default rolesApi;
