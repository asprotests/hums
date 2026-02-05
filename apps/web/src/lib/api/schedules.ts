import api, { type ApiResponse } from '../api';

// ============ Types ============

export type ScheduleType = 'LECTURE' | 'LAB' | 'TUTORIAL' | 'EXAM';

export interface Schedule {
  id: string;
  classId: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType: ScheduleType;
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      code: string;
    };
    lecturer: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  room?: {
    id: string;
    name: string;
    building?: string;
    capacity: number;
  };
}

export interface ScheduleFilters {
  classId?: string;
  roomId?: string;
  dayOfWeek?: number;
  semesterId?: string;
  lecturerId?: string;
}

export interface CreateScheduleInput {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType?: ScheduleType;
}

export interface UpdateScheduleInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string | null;
  scheduleType?: ScheduleType;
}

export interface BulkScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType?: ScheduleType;
}

export interface LecturerSchedule {
  schedules: Schedule[];
  byDay: {
    day: number;
    dayName: string;
    schedules: Schedule[];
  }[];
}

export interface CopySchedulesResult {
  created: Schedule[];
  errors: {
    schedule: string;
    error: string;
  }[];
}

// ============ Schedule API ============

export const schedulesApi = {
  getSchedules: async (filters: ScheduleFilters = {}): Promise<ApiResponse<Schedule[]>> => {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.roomId) params.append('roomId', filters.roomId);
    if (typeof filters.dayOfWeek === 'number') params.append('dayOfWeek', String(filters.dayOfWeek));
    if (filters.semesterId) params.append('semesterId', filters.semesterId);
    if (filters.lecturerId) params.append('lecturerId', filters.lecturerId);

    const response = await api.get<ApiResponse<Schedule[]>>(`/api/v1/schedules?${params.toString()}`);
    return response.data;
  },

  getScheduleById: async (id: string): Promise<ApiResponse<Schedule>> => {
    const response = await api.get<ApiResponse<Schedule>>(`/api/v1/schedules/${id}`);
    return response.data;
  },

  createSchedule: async (data: CreateScheduleInput): Promise<ApiResponse<Schedule>> => {
    const response = await api.post<ApiResponse<Schedule>>('/api/v1/schedules', data);
    return response.data;
  },

  updateSchedule: async (id: string, data: UpdateScheduleInput): Promise<ApiResponse<Schedule>> => {
    const response = await api.patch<ApiResponse<Schedule>>(`/api/v1/schedules/${id}`, data);
    return response.data;
  },

  deleteSchedule: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/schedules/${id}`);
    return response.data;
  },

  getClassSchedules: async (classId: string): Promise<ApiResponse<Schedule[]>> => {
    const response = await api.get<ApiResponse<Schedule[]>>(`/api/v1/schedules/class/${classId}`);
    return response.data;
  },

  bulkCreateSchedules: async (classId: string, schedules: BulkScheduleInput[]): Promise<ApiResponse<Schedule[]>> => {
    const response = await api.post<ApiResponse<Schedule[]>>(
      `/api/v1/schedules/class/${classId}/bulk`,
      { schedules }
    );
    return response.data;
  },

  copySchedules: async (sourceClassId: string, targetClassId: string): Promise<ApiResponse<CopySchedulesResult>> => {
    const response = await api.post<ApiResponse<CopySchedulesResult>>(
      `/api/v1/schedules/class/${sourceClassId}/copy`,
      { targetClassId }
    );
    return response.data;
  },

  getLecturerSchedule: async (lecturerId: string, semesterId: string): Promise<ApiResponse<LecturerSchedule>> => {
    const response = await api.get<ApiResponse<LecturerSchedule>>(
      `/api/v1/schedules/lecturer/${lecturerId}?semesterId=${semesterId}`
    );
    return response.data;
  },
};

export default schedulesApi;
