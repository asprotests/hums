import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService, AuditAction } from './audit.service.js';
import type { Prisma, RoomType } from '@hums/database';

export interface CreateRoomInput {
  name: string;
  building?: string;
  capacity: number;
  roomType?: RoomType;
  facilities?: string[];
}

export interface UpdateRoomInput {
  name?: string;
  building?: string;
  capacity?: number;
  roomType?: RoomType;
  facilities?: string[];
  isActive?: boolean;
}

export interface RoomFilters {
  building?: string;
  roomType?: RoomType;
  minCapacity?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class RoomService {
  /**
   * Create a new room
   */
  async createRoom(data: CreateRoomInput, userId?: string) {
    // Check if room name already exists
    const existing = await prisma.room.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw AppError.conflict('Room with this name already exists');
    }

    const room = await prisma.room.create({
      data: {
        name: data.name,
        building: data.building,
        capacity: data.capacity,
        roomType: data.roomType || 'CLASSROOM',
        facilities: data.facilities || [],
      },
    });

    await auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'Room',
      resourceId: room.id,
      newValues: room,
    });

    return room;
  }

  /**
   * Get rooms with filters and pagination
   */
  async getRooms(filters: RoomFilters = {}) {
    const {
      building,
      roomType,
      minCapacity,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.RoomWhereInput = {
      deletedAt: null,
    };

    if (building) {
      where.building = building;
    }

    if (roomType) {
      where.roomType = roomType;
    }

    if (minCapacity) {
      where.capacity = { gte: minCapacity };
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { building: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        orderBy: [{ building: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.room.count({ where }),
    ]);

    return {
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get room by ID
   */
  async getRoomById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room || room.deletedAt) {
      throw AppError.notFound('Room not found');
    }

    return room;
  }

  /**
   * Update room
   */
  async updateRoom(id: string, data: UpdateRoomInput, userId?: string) {
    const room = await this.getRoomById(id);

    // Check name uniqueness if changing
    if (data.name && data.name !== room.name) {
      const existing = await prisma.room.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw AppError.conflict('Room with this name already exists');
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data,
    });

    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'Room',
      resourceId: id,
      oldValues: room,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Delete room (soft delete)
   */
  async deleteRoom(id: string, userId?: string) {
    const room = await this.getRoomById(id);

    // Check if room has any scheduled classes
    const scheduleCount = await prisma.schedule.count({
      where: { roomId: id },
    });

    if (scheduleCount > 0) {
      throw AppError.conflict('Cannot delete room with scheduled classes. Remove schedules first.');
    }

    const deleted = await prisma.room.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'Room',
      resourceId: id,
      oldValues: room,
    });

    return deleted;
  }

  /**
   * Check room availability for a specific time slot
   */
  async checkRoomAvailability(
    roomId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string
  ) {
    const room = await this.getRoomById(roomId);

    if (!room.isActive) {
      return { available: false, reason: 'Room is not active' };
    }

    // Find conflicting schedules
    const conflicts = await prisma.schedule.findMany({
      where: {
        roomId,
        dayOfWeek,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        OR: [
          // New slot starts during existing slot
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New slot ends during existing slot
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New slot completely contains existing slot
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (conflicts.length > 0) {
      return {
        available: false,
        reason: 'Room is already booked',
        conflicts: conflicts.map((c) => ({
          scheduleId: c.id,
          className: c.class.name,
          courseName: c.class.course.name,
          time: `${c.startTime}-${c.endTime}`,
        })),
      };
    }

    return { available: true };
  }

  /**
   * Get room schedule for a semester
   */
  async getRoomSchedule(roomId: string, semesterId: string) {
    await this.getRoomById(roomId);

    const schedules = await prisma.schedule.findMany({
      where: {
        roomId,
        class: {
          semesterId,
          deletedAt: null,
        },
      },
      include: {
        class: {
          include: {
            course: true,
            lecturer: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return schedules;
  }

  /**
   * Get all unique buildings
   */
  async getBuildings() {
    const buildings = await prisma.room.findMany({
      where: { deletedAt: null },
      select: { building: true },
      distinct: ['building'],
    });

    return buildings
      .map((b) => b.building)
      .filter((b): b is string => b !== null)
      .sort();
  }
}

export const roomService = new RoomService();
