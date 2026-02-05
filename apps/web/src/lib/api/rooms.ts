import api, { type ApiResponse } from '../api';

// ============ Types ============

export type RoomType = 'CLASSROOM' | 'LAB' | 'AUDITORIUM' | 'SEMINAR_ROOM';

export interface Room {
  id: string;
  name: string;
  building?: string;
  capacity: number;
  roomType: RoomType;
  facilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomFilters {
  page?: number;
  limit?: number;
  search?: string;
  building?: string;
  roomType?: RoomType;
  minCapacity?: number;
  isActive?: boolean;
}

export interface PaginatedRooms {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateRoomInput {
  name: string;
  building?: string;
  capacity: number;
  roomType?: RoomType;
  facilities?: string[];
}

export interface UpdateRoomInput {
  name?: string;
  building?: string | null;
  capacity?: number;
  roomType?: RoomType;
  facilities?: string[];
  isActive?: boolean;
}

export interface RoomAvailability {
  available: boolean;
  reason?: string;
  conflicts?: {
    scheduleId: string;
    className: string;
    courseName: string;
    time: string;
  }[];
}

export interface RoomSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  scheduleType: string;
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
}

// ============ API Response Interfaces ============

interface PaginatedApiResponse {
  success: boolean;
  data: Room[];
  pagination: PaginatedRooms['pagination'];
  message?: string;
}

// ============ Room API ============

export const roomsApi = {
  getRooms: async (filters: RoomFilters = {}): Promise<ApiResponse<PaginatedRooms>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.building) params.append('building', filters.building);
    if (filters.roomType) params.append('roomType', filters.roomType);
    if (filters.minCapacity) params.append('minCapacity', String(filters.minCapacity));
    if (typeof filters.isActive === 'boolean') params.append('isActive', String(filters.isActive));

    const response = await api.get<PaginatedApiResponse>(`/api/v1/rooms?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getRoomById: async (id: string): Promise<ApiResponse<Room>> => {
    const response = await api.get<ApiResponse<Room>>(`/api/v1/rooms/${id}`);
    return response.data;
  },

  createRoom: async (data: CreateRoomInput): Promise<ApiResponse<Room>> => {
    const response = await api.post<ApiResponse<Room>>('/api/v1/rooms', data);
    return response.data;
  },

  updateRoom: async (id: string, data: UpdateRoomInput): Promise<ApiResponse<Room>> => {
    const response = await api.patch<ApiResponse<Room>>(`/api/v1/rooms/${id}`, data);
    return response.data;
  },

  deleteRoom: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/rooms/${id}`);
    return response.data;
  },

  getBuildings: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>('/api/v1/rooms/buildings');
    return response.data;
  },

  checkAvailability: async (
    id: string,
    day: number,
    start: string,
    end: string
  ): Promise<ApiResponse<RoomAvailability>> => {
    const params = new URLSearchParams();
    params.append('day', String(day));
    params.append('start', start);
    params.append('end', end);
    const response = await api.get<ApiResponse<RoomAvailability>>(
      `/api/v1/rooms/${id}/availability?${params.toString()}`
    );
    return response.data;
  },

  getSchedule: async (id: string, semesterId: string): Promise<ApiResponse<RoomSchedule[]>> => {
    const response = await api.get<ApiResponse<RoomSchedule[]>>(
      `/api/v1/rooms/${id}/schedule?semesterId=${semesterId}`
    );
    return response.data;
  },
};

export default roomsApi;
