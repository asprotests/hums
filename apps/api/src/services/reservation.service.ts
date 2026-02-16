import { prisma, Prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

type ReservationStatus = 'PENDING' | 'READY' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

const RESERVATION_CONFIG = {
  maxReservationsPerUser: 5,
  reservationHoldDays: 2,
  expirationDays: 30, // How long a reservation can stay pending
};

export interface ReservationFilters {
  status?: ReservationStatus;
  userId?: string;
  bookId?: string;
}

class ReservationService {
  /**
   * Reserve a book
   */
  async reserveBook(bookId: string, userId: string) {
    // Check if book exists
    const book = await prisma.book.findFirst({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // Check if user already has an active reservation for this book
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        bookId,
        userId,
        status: { in: ['PENDING', 'READY'] },
      },
    });

    if (existingReservation) {
      throw AppError.badRequest('You already have an active reservation for this book');
    }

    // Check user's total reservations
    const userReservations = await prisma.reservation.count({
      where: {
        userId,
        status: { in: ['PENDING', 'READY'] },
      },
    });

    if (userReservations >= RESERVATION_CONFIG.maxReservationsPerUser) {
      throw AppError.badRequest(`Maximum reservations (${RESERVATION_CONFIG.maxReservationsPerUser}) reached`);
    }

    // Check if book is available
    if (book.availableCopies > 0) {
      throw AppError.badRequest('Book is currently available, no need to reserve');
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RESERVATION_CONFIG.expirationDays);

    const reservation = await prisma.reservation.create({
      data: {
        bookId,
        userId,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        book: {
          select: { id: true, title: true, author: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await auditService.log({
      action: 'CREATE',
      resource: 'Reservation',
      resourceId: reservation.id,
      userId,
      newValues: { bookId, status: 'PENDING' },
    });

    // Calculate queue position
    const queuePosition = await this.getQueuePosition(bookId, reservation.id);

    return { ...reservation, queuePosition };
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string, userId: string, isAdmin = false) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw AppError.notFound('Reservation not found');
    }

    if (!isAdmin && reservation.userId !== userId) {
      throw AppError.forbidden('You can only cancel your own reservations');
    }

    if (reservation.status === 'FULFILLED') {
      throw AppError.badRequest('Cannot cancel a fulfilled reservation');
    }

    if (reservation.status === 'CANCELLED' || reservation.status === 'EXPIRED') {
      throw AppError.badRequest('Reservation is already cancelled or expired');
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Reservation',
      resourceId: reservationId,
      userId,
      oldValues: { status: reservation.status },
      newValues: { status: 'CANCELLED' },
    });

    return updated;
  }

  /**
   * Fulfill a reservation (when book is issued to the reserved user)
   */
  async fulfillReservation(reservationId: string, userId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw AppError.notFound('Reservation not found');
    }

    if (reservation.status !== 'READY') {
      throw AppError.badRequest('Reservation is not ready for pickup');
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'FULFILLED',
        fulfilledAt: new Date(),
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Reservation',
      resourceId: reservationId,
      userId,
      oldValues: { status: 'READY' },
      newValues: { status: 'FULFILLED' },
    });

    return updated;
  }

  /**
   * Get reservations with filters
   */
  async getReservations(filters: ReservationFilters, page = 1, limit = 20) {
    const where: Prisma.ReservationWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.bookId) {
      where.bookId = filters.bookId;
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          book: {
            select: { id: true, title: true, author: true, availableCopies: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { reservedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(userId: string) {
    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: {
        book: {
          select: { id: true, title: true, author: true, coverImage: true, availableCopies: true },
        },
      },
      orderBy: { reservedAt: 'desc' },
    });

    // Add queue position to each pending reservation
    const reservationsWithPosition = await Promise.all(
      reservations.map(async (r) => {
        if (r.status === 'PENDING') {
          const queuePosition = await this.getQueuePosition(r.bookId, r.id);
          return { ...r, queuePosition };
        }
        return r;
      })
    );

    return reservationsWithPosition;
  }

  /**
   * Get book reservations
   */
  async getBookReservations(bookId: string) {
    return prisma.reservation.findMany({
      where: {
        bookId,
        status: { in: ['PENDING', 'READY'] },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { reservedAt: 'asc' },
    });
  }

  /**
   * Get reservations ready for pickup
   */
  async getReadyForPickup() {
    return prisma.reservation.findMany({
      where: { status: 'READY' },
      include: {
        book: {
          select: { id: true, title: true, author: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { notifiedAt: 'asc' },
    });
  }

  /**
   * Get queue position for a reservation
   */
  async getQueuePosition(bookId: string, reservationId: string): Promise<number> {
    const reservations = await prisma.reservation.findMany({
      where: {
        bookId,
        status: 'PENDING',
      },
      orderBy: { reservedAt: 'asc' },
      select: { id: true },
    });

    const position = reservations.findIndex((r) => r.id === reservationId);
    return position + 1; // 1-based position
  }

  /**
   * Process reservation queue when a book becomes available
   */
  async processReservationQueue(bookId: string) {
    const nextReservation = await prisma.reservation.findFirst({
      where: {
        bookId,
        status: 'PENDING',
      },
      orderBy: { reservedAt: 'asc' },
    });

    if (nextReservation) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + RESERVATION_CONFIG.reservationHoldDays);

      await prisma.reservation.update({
        where: { id: nextReservation.id },
        data: {
          status: 'READY',
          notifiedAt: new Date(),
          expiresAt,
        },
      });

      // TODO: Send notification to user

      return nextReservation;
    }

    return null;
  }

  /**
   * Expire old reservations (for cron job)
   */
  async expireOldReservations() {
    const now = new Date();

    // Expire PENDING reservations that have passed expiration
    const expiredPending = await prisma.reservation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    // Expire READY reservations that have passed expiration (not picked up)
    const expiredReady = await prisma.reservation.updateMany({
      where: {
        status: 'READY',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    // For each expired READY reservation, process the queue
    const expiredReadyReservations = await prisma.reservation.findMany({
      where: {
        status: 'EXPIRED',
        notifiedAt: { not: null },
      },
      distinct: ['bookId'],
    });

    for (const reservation of expiredReadyReservations) {
      await this.processReservationQueue(reservation.bookId);
    }

    return {
      expiredPending: expiredPending.count,
      expiredReady: expiredReady.count,
    };
  }

  /**
   * Get reservation by ID
   */
  async getReservationById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        book: {
          select: { id: true, title: true, author: true, coverImage: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!reservation) {
      throw AppError.notFound('Reservation not found');
    }

    return reservation;
  }
}

export const reservationService = new ReservationService();
