import api, { type ApiResponse } from '../api';

// Types
export interface GradeScaleItem {
  minScore: number;
  maxScore: number;
  letterGrade: string;
  gradePoints: number;
}

export interface SystemConfig {
  // Branding
  universityName: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;

  // Localization
  timezone: string;
  dateFormat: string;
  currency: string;

  // Academic
  minAttendancePercentage: number;
  gradeScale: GradeScaleItem[];

  // Security
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
}

export interface PublicConfig {
  universityName: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  timezone: string;
  dateFormat: string;
  currency: string;
}

export interface UpdateConfigInput {
  universityName?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  minAttendancePercentage?: number;
  gradeScale?: GradeScaleItem[];
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  passwordExpiryDays?: number;
}

// API Functions
export const configApi = {
  // Get public config (no auth required)
  getPublicConfig: async (): Promise<ApiResponse<PublicConfig>> => {
    const response = await api.get<ApiResponse<PublicConfig>>('/api/v1/config/public');
    return response.data;
  },

  // Get all config (admin only)
  getConfig: async (): Promise<ApiResponse<SystemConfig>> => {
    const response = await api.get<ApiResponse<SystemConfig>>('/api/v1/config');
    return response.data;
  },

  // Update config
  updateConfig: async (data: UpdateConfigInput): Promise<ApiResponse<SystemConfig>> => {
    const response = await api.patch<ApiResponse<SystemConfig>>('/api/v1/config', data);
    return response.data;
  },

  // Upload logo
  uploadLogo: async (file: File): Promise<ApiResponse<{ logoUrl: string }>> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post<ApiResponse<{ logoUrl: string }>>('/api/v1/config/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get grade scale
  getGradeScale: async (): Promise<ApiResponse<GradeScaleItem[]>> => {
    const response = await api.get<ApiResponse<GradeScaleItem[]>>('/api/v1/config/grade-scale');
    return response.data;
  },

  // Reset to defaults
  resetToDefaults: async (): Promise<ApiResponse<SystemConfig>> => {
    const response = await api.post<ApiResponse<SystemConfig>>('/api/v1/config/reset');
    return response.data;
  },
};

export default configApi;
