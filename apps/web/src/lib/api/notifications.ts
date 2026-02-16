import api, { type ApiResponse } from '../api';

// Types
export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'ACADEMIC'
  | 'FINANCE'
  | 'LIBRARY'
  | 'HR'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API functions
export const notificationsApi = {
  /**
   * Get current user's notifications
   */
  getNotifications: async (filters?: NotificationFilters): Promise<ApiResponse<PaginatedNotifications>> => {
    const params = new URLSearchParams();
    if (filters?.unreadOnly) params.append('unreadOnly', 'true');
    if (filters?.type) params.append('type', filters.type);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<PaginatedNotifications>>(`/api/v1/notifications?${params.toString()}`);
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.get<ApiResponse<{ count: number }>>('/api/v1/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
    const response = await api.patch<ApiResponse<Notification>>(`/api/v1/notifications/${notificationId}/read`, {});
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.post<ApiResponse<{ count: number }>>('/api/v1/notifications/mark-all-read', {});
    return response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Clear all notifications
   */
  clearAll: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.delete<ApiResponse<{ count: number }>>('/api/v1/notifications/clear-all');
    return response.data;
  },

  // Admin functions

  /**
   * Send notification to a user (admin)
   */
  sendNotification: async (data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    link?: string;
  }): Promise<ApiResponse<Notification>> => {
    const response = await api.post<ApiResponse<Notification>>('/api/v1/notifications/send', data);
    return response.data;
  },

  /**
   * Send notification to multiple users (admin)
   */
  sendBulkNotification: async (data: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    link?: string;
  }): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.post<ApiResponse<{ count: number }>>('/api/v1/notifications/send-bulk', data);
    return response.data;
  },

  /**
   * Send notification to users with a role (admin)
   */
  sendToRole: async (data: {
    roleName: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    link?: string;
  }): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.post<ApiResponse<{ count: number }>>('/api/v1/notifications/send-to-role', data);
    return response.data;
  },
};
