// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Error response
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: string[];
}

// Query params
export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, string | number | boolean>;
}
