import api, { type ApiResponse } from '../api';

export interface OtherFee {
  name: string;
  amount: number;
}

export interface FeeStructure {
  id: string;
  programId: string;
  program?: {
    id: string;
    code: string;
    name: string;
    nameSo?: string;
  };
  academicYear: string;
  tuitionFee: number;
  registrationFee: number;
  libraryFee: number;
  labFee: number;
  otherFees?: OtherFee[];
  totalFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureFilters {
  page?: number;
  limit?: number;
  programId?: string;
  academicYear?: string;
}

export interface PaginatedFeeStructures {
  data: FeeStructure[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateFeeStructureInput {
  programId: string;
  academicYear: string;
  tuitionFee: number;
  registrationFee: number;
  libraryFee: number;
  labFee?: number;
  otherFees?: OtherFee[];
}

export interface UpdateFeeStructureInput {
  tuitionFee?: number;
  registrationFee?: number;
  libraryFee?: number;
  labFee?: number;
  otherFees?: OtherFee[];
}

interface PaginatedApiResponse {
  success: boolean;
  data: FeeStructure[];
  pagination: PaginatedFeeStructures['pagination'];
  message?: string;
}

export const feeStructuresApi = {
  getFeeStructures: async (filters: FeeStructureFilters = {}): Promise<ApiResponse<PaginatedFeeStructures>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.programId) params.append('programId', filters.programId);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/fee-structures?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getFeeStructureById: async (id: string): Promise<ApiResponse<FeeStructure>> => {
    const response = await api.get<ApiResponse<FeeStructure>>(`/api/v1/fee-structures/${id}`);
    return response.data;
  },

  getFeeStructuresByProgram: async (programId: string): Promise<ApiResponse<FeeStructure[]>> => {
    const response = await api.get<ApiResponse<FeeStructure[]>>(`/api/v1/fee-structures/program/${programId}`);
    return response.data;
  },

  createFeeStructure: async (data: CreateFeeStructureInput): Promise<ApiResponse<FeeStructure>> => {
    const response = await api.post<ApiResponse<FeeStructure>>('/api/v1/fee-structures', data);
    return response.data;
  },

  updateFeeStructure: async (id: string, data: UpdateFeeStructureInput): Promise<ApiResponse<FeeStructure>> => {
    const response = await api.patch<ApiResponse<FeeStructure>>(`/api/v1/fee-structures/${id}`, data);
    return response.data;
  },

  deleteFeeStructure: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/api/v1/fee-structures/${id}`);
    return response.data;
  },

  calculateTotal: async (id: string): Promise<ApiResponse<{ total: number }>> => {
    const response = await api.get<ApiResponse<{ total: number }>>(`/api/v1/fee-structures/${id}/total`);
    return response.data;
  },
};

export default feeStructuresApi;
