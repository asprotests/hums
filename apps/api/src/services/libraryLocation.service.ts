import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

export interface CreateLocationInput {
  name: string;
  building?: string;
  floor?: string;
  section?: string;
  capacity?: number;
}

export interface UpdateLocationInput {
  name?: string;
  building?: string;
  floor?: string;
  section?: string;
  capacity?: number;
  isActive?: boolean;
}

class LibraryLocationService {
  /**
   * Get all locations
   */
  async getLocations(includeInactive = false) {
    const locations = await prisma.libraryLocation.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { books: true } },
      },
      orderBy: { name: 'asc' },
    });

    return locations.map(loc => ({
      ...loc,
      bookCount: loc._count.books,
      _count: undefined,
    }));
  }

  /**
   * Get location by ID
   */
  async getLocationById(id: string) {
    const location = await prisma.libraryLocation.findUnique({
      where: { id },
      include: {
        _count: { select: { books: true } },
      },
    });

    if (!location) {
      throw AppError.notFound('Location not found');
    }

    return {
      ...location,
      bookCount: location._count.books,
      _count: undefined,
    };
  }

  /**
   * Create a new location
   */
  async createLocation(data: CreateLocationInput, userId: string) {
    // Check for duplicate name
    const existing = await prisma.libraryLocation.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw AppError.badRequest('A location with this name already exists');
    }

    const location = await prisma.libraryLocation.create({
      data: {
        name: data.name,
        building: data.building,
        floor: data.floor,
        section: data.section,
        capacity: data.capacity,
      },
    });

    await auditService.log({
      action: 'CREATE',
      resource: 'LibraryLocation',
      resourceId: location.id,
      userId,
      newValues: data,
    });

    return location;
  }

  /**
   * Update a location
   */
  async updateLocation(id: string, data: UpdateLocationInput, userId: string) {
    const location = await prisma.libraryLocation.findUnique({ where: { id } });
    if (!location) {
      throw AppError.notFound('Location not found');
    }

    // Check for duplicate name
    if (data.name && data.name !== location.name) {
      const existing = await prisma.libraryLocation.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw AppError.badRequest('A location with this name already exists');
      }
    }

    const updated = await prisma.libraryLocation.update({
      where: { id },
      data: {
        name: data.name,
        building: data.building,
        floor: data.floor,
        section: data.section,
        capacity: data.capacity,
        isActive: data.isActive,
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'LibraryLocation',
      resourceId: id,
      userId,
      oldValues: location,
      newValues: data,
    });

    return updated;
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: string, userId: string) {
    const location = await prisma.libraryLocation.findUnique({
      where: { id },
      include: {
        _count: { select: { books: true } },
      },
    });

    if (!location) {
      throw AppError.notFound('Location not found');
    }

    if (location._count.books > 0) {
      throw AppError.badRequest('Cannot delete location with books. Move books to another location first.');
    }

    await prisma.libraryLocation.delete({ where: { id } });

    await auditService.log({
      action: 'DELETE',
      resource: 'LibraryLocation',
      resourceId: id,
      userId,
      oldValues: location,
    });
  }
}

export const libraryLocationService = new LibraryLocationService();
