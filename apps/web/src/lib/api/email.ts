import api, { type ApiResponse } from '../api';

// Email template names
export type EmailTemplateName =
  | 'welcome'
  | 'password-reset'
  | 'password-changed'
  | 'application-received'
  | 'application-approved'
  | 'application-rejected'
  | 'enrollment-confirmed'
  | 'grades-published'
  | 'attendance-warning'
  | 'invoice-generated'
  | 'payment-received'
  | 'payment-reminder'
  | 'payment-overdue'
  | 'leave-request-submitted'
  | 'leave-approved'
  | 'leave-rejected'
  | 'payslip-ready'
  | 'contract-expiring'
  | 'book-due-reminder'
  | 'book-overdue'
  | 'reservation-ready'
  | 'announcement'
  | 'custom';

export type EmailStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'BOUNCED';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  subjectLocal?: string;
  bodyHtml: string;
  bodyText: string;
  bodyHtmlLocal?: string;
  bodyTextLocal?: string;
  variables: string[];
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  template?: string;
  status: EmailStatus;
  error?: string;
  attempts: number;
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface EmailPreview {
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

// API functions
export const emailApi = {
  // ============================================
  // Email Sending
  // ============================================

  /**
   * Send an email immediately
   */
  sendEmail: async (data: {
    to: string | string[];
    subject: string;
    template?: EmailTemplateName;
    data?: Record<string, any>;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
  }): Promise<ApiResponse<{ success: boolean; messageId?: string; error?: string }>> => {
    const response = await api.post<ApiResponse<{ success: boolean; messageId?: string; error?: string }>>('/api/v1/email/send', data);
    return response.data;
  },

  /**
   * Send bulk emails
   */
  sendBulkEmails: async (
    emails: Array<{
      to: string | string[];
      subject: string;
      template?: EmailTemplateName;
      data?: Record<string, any>;
    }>
  ): Promise<ApiResponse<{ results: any[]; successful: number; failed: number }>> => {
    const response = await api.post<ApiResponse<{ results: any[]; successful: number; failed: number }>>('/api/v1/email/send-bulk', { emails });
    return response.data;
  },

  /**
   * Schedule an email
   */
  scheduleEmail: async (data: {
    to: string | string[];
    subject: string;
    template?: EmailTemplateName;
    data?: Record<string, any>;
    scheduledAt: Date;
  }): Promise<ApiResponse<{ id: string; scheduledAt: string }>> => {
    const response = await api.post<ApiResponse<{ id: string; scheduledAt: string }>>('/api/v1/email/schedule', data);
    return response.data;
  },

  /**
   * Cancel a scheduled email
   */
  cancelScheduledEmail: async (emailId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/email/scheduled/${emailId}`);
    return response.data;
  },

  /**
   * Get queue status
   */
  getQueueStatus: async (): Promise<ApiResponse<QueueStats>> => {
    const response = await api.get<ApiResponse<QueueStats>>('/api/v1/email/queue/status');
    return response.data;
  },

  /**
   * Send test email
   */
  sendTestEmail: async (
    to: string,
    template?: EmailTemplateName
  ): Promise<ApiResponse<{ success: boolean; error?: string }>> => {
    const response = await api.post<ApiResponse<{ success: boolean; error?: string }>>('/api/v1/email/test', { to, template });
    return response.data;
  },

  /**
   * Verify SMTP connection
   */
  verifyConnection: async (): Promise<ApiResponse<{ connected: boolean }>> => {
    const response = await api.get<ApiResponse<{ connected: boolean }>>('/api/v1/email/verify');
    return response.data;
  },

  /**
   * Get email logs
   */
  getEmailLogs: async (filters?: {
    status?: EmailStatus;
    template?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      data: EmailLog[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.template) params.append('template', filters.template);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/api/v1/email/logs?${params.toString()}`);
    return response.data;
  },

  // ============================================
  // Templates
  // ============================================

  /**
   * Get all templates
   */
  getTemplates: async (filters?: {
    category?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<EmailTemplate[]>> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const response = await api.get<ApiResponse<EmailTemplate[]>>(`/api/v1/email/templates?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a specific template
   */
  getTemplate: async (name: EmailTemplateName): Promise<ApiResponse<EmailTemplate>> => {
    const response = await api.get<ApiResponse<EmailTemplate>>(`/api/v1/email/templates/${name}`);
    return response.data;
  },

  /**
   * Update a template
   */
  updateTemplate: async (
    id: string,
    data: {
      subject?: string;
      subjectLocal?: string;
      bodyHtml?: string;
      bodyText?: string;
      bodyHtmlLocal?: string;
      bodyTextLocal?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<EmailTemplate>> => {
    const response = await api.patch<ApiResponse<EmailTemplate>>(`/api/v1/email/templates/${id}`, data);
    return response.data;
  },

  /**
   * Reset template to default
   */
  resetTemplate: async (name: EmailTemplateName): Promise<ApiResponse<EmailTemplate>> => {
    const response = await api.post<ApiResponse<EmailTemplate>>(`/api/v1/email/templates/${name}/reset`, {});
    return response.data;
  },

  /**
   * Preview a template
   */
  previewTemplate: async (
    name: EmailTemplateName,
    data?: Record<string, any>
  ): Promise<ApiResponse<EmailPreview>> => {
    const response = await api.post<ApiResponse<EmailPreview>>(`/api/v1/email/templates/${name}/preview`, { data });
    return response.data;
  },

  /**
   * Send test email with template
   */
  testTemplate: async (
    name: EmailTemplateName,
    to: string
  ): Promise<ApiResponse<{ success: boolean; error?: string }>> => {
    const response = await api.post<ApiResponse<{ success: boolean; error?: string }>>(`/api/v1/email/templates/${name}/test`, { to });
    return response.data;
  },

  /**
   * Seed default templates
   */
  seedTemplates: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/api/v1/email/templates/seed', {});
    return response.data;
  },
};
