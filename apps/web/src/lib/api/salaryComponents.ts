import api, { type ApiResponse } from '../api';

export type SalaryComponentType = 'ALLOWANCE' | 'DEDUCTION';
export type CalculationType = 'FIXED' | 'PERCENTAGE';

export interface SalaryComponent {
  id: string;
  name: string;
  type: SalaryComponentType;
  calculationType: CalculationType;
  defaultValue: number;
  isActive: boolean;
  appliesToAll: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryComponentInput {
  name: string;
  type: SalaryComponentType;
  calculationType: CalculationType;
  defaultValue: number;
  isActive?: boolean;
  appliesToAll?: boolean;
  description?: string;
}

export interface UpdateSalaryComponentInput {
  name?: string;
  type?: SalaryComponentType;
  calculationType?: CalculationType;
  defaultValue?: number;
  isActive?: boolean;
  appliesToAll?: boolean;
  description?: string;
}

export interface AssignComponentInput {
  employeeId: string;
  value?: number;
}

export interface EmployeeSalaryComponent {
  component: SalaryComponent;
  value: number;
  isAssigned: boolean;
}

export const salaryComponentsApi = {
  getComponents: async (includeInactive = false): Promise<ApiResponse<SalaryComponent[]>> => {
    const response = await api.get<ApiResponse<SalaryComponent[]>>(
      `/api/v1/salary-components?includeInactive=${includeInactive}`
    );
    return response.data;
  },

  getComponentById: async (id: string): Promise<ApiResponse<SalaryComponent>> => {
    const response = await api.get<ApiResponse<SalaryComponent>>(`/api/v1/salary-components/${id}`);
    return response.data;
  },

  createComponent: async (data: CreateSalaryComponentInput): Promise<ApiResponse<SalaryComponent>> => {
    const response = await api.post<ApiResponse<SalaryComponent>>('/api/v1/salary-components', data);
    return response.data;
  },

  updateComponent: async (id: string, data: UpdateSalaryComponentInput): Promise<ApiResponse<SalaryComponent>> => {
    const response = await api.patch<ApiResponse<SalaryComponent>>(`/api/v1/salary-components/${id}`, data);
    return response.data;
  },

  assignToEmployee: async (componentId: string, data: AssignComponentInput): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(`/api/v1/salary-components/${componentId}/assign`, data);
    return response.data;
  },

  removeFromEmployee: async (componentId: string, employeeId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(
      `/api/v1/salary-components/${componentId}/employees/${employeeId}`
    );
    return response.data;
  },

  getEmployeeComponents: async (employeeId: string): Promise<ApiResponse<EmployeeSalaryComponent[]>> => {
    const response = await api.get<ApiResponse<EmployeeSalaryComponent[]>>(
      `/api/v1/employees/${employeeId}/salary-components`
    );
    return response.data;
  },

  initializeDefaults: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/api/v1/salary-components/initialize');
    return response.data;
  },
};

export default salaryComponentsApi;
