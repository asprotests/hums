import api from '../api';

// ============= Types =============

export type MaterialType =
  | 'DOCUMENT'
  | 'VIDEO'
  | 'LINK'
  | 'SLIDES'
  | 'SYLLABUS'
  | 'ASSIGNMENT'
  | 'OTHER';

export interface CourseMaterial {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  type: MaterialType;
  fileUrl: string | null;
  externalUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  week: number | null;
  orderIndex: number;
  isPublished: boolean;
  publishedAt: string | null;
  uploadedById: string;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialInput {
  title: string;
  description?: string;
  type: MaterialType;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  mimeType?: string;
  week?: number;
  isPublished?: boolean;
}

export interface UpdateMaterialInput {
  title?: string;
  description?: string | null;
  type?: MaterialType;
  fileUrl?: string | null;
  externalUrl?: string | null;
  week?: number | null;
}

export interface MaterialStats {
  total: number;
  published: number;
  byType: Record<string, number>;
  byWeek: Record<number, number>;
}

// ============= API Functions =============

export const courseMaterialsApi = {
  /**
   * Get all materials for a class
   */
  getMaterials: async (classId: string, includeUnpublished: boolean = false) => {
    const params = new URLSearchParams();
    if (includeUnpublished) params.append('includeUnpublished', 'true');

    const response = await api.get<{ success: boolean; data: CourseMaterial[] }>(
      `/classes/${classId}/materials?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single material by ID
   */
  getMaterial: async (id: string) => {
    const response = await api.get<{ success: boolean; data: CourseMaterial }>(
      `/materials/${id}`
    );
    return response.data;
  },

  /**
   * Create a new material
   */
  createMaterial: async (classId: string, input: CreateMaterialInput) => {
    const response = await api.post<{ success: boolean; data: CourseMaterial }>(
      `/classes/${classId}/materials`,
      input
    );
    return response.data;
  },

  /**
   * Update a material
   */
  updateMaterial: async (id: string, input: UpdateMaterialInput) => {
    const response = await api.patch<{ success: boolean; data: CourseMaterial }>(
      `/materials/${id}`,
      input
    );
    return response.data;
  },

  /**
   * Delete a material
   */
  deleteMaterial: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/materials/${id}`);
    return response.data;
  },

  /**
   * Publish a material
   */
  publishMaterial: async (id: string) => {
    const response = await api.post<{ success: boolean; data: CourseMaterial }>(
      `/materials/${id}/publish`
    );
    return response.data;
  },

  /**
   * Unpublish a material
   */
  unpublishMaterial: async (id: string) => {
    const response = await api.post<{ success: boolean; data: CourseMaterial }>(
      `/materials/${id}/unpublish`
    );
    return response.data;
  },

  /**
   * Reorder materials
   */
  reorderMaterials: async (classId: string, orderedIds: string[]) => {
    const response = await api.patch<{ success: boolean }>(
      `/classes/${classId}/materials/reorder`,
      { orderedIds }
    );
    return response.data;
  },

  /**
   * Get material statistics for a class
   */
  getMaterialStats: async (classId: string) => {
    const response = await api.get<{ success: boolean; data: MaterialStats }>(
      `/classes/${classId}/materials/stats`
    );
    return response.data;
  },
};

export default courseMaterialsApi;
