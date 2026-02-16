import { prisma, Prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

type BorrowingStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';

// Configuration
const BORROWING_CONFIG = {
  studentMaxBooks: 5,
  employeeMaxBooks: 10,
  loanPeriodDays: 14,
  maxRenewals: 2,
  lateFeePerDay: 0.50,
  gracePeriodDays: 1,
  reservationHoldDays: 2,
};

export interface IssueBookInput {
  bookCopyId?: string;
  barcode?: string;
  borrowerId: string;
  borrowerType: 'STUDENT' | 'EMPLOYEE';
}

export interface BorrowingFilters {
  status?: BorrowingStatus;
  borrowerId?: string;
  borrowerType?: string;
  isOverdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

class BorrowingService {
  /**
   * Issue a book to a member
   */
  async issueBook(data: IssueBookInput, issuedById: string) {
    // Get the book copy
    let bookCopy;
    if (data.barcode) {
      bookCopy = await prisma.bookCopy.findUnique({
        where: { barcode: data.barcode },
        include: { book: true },
      });
    } else if (data.bookCopyId) {
      bookCopy = await prisma.bookCopy.findUnique({
        where: { id: data.bookCopyId },
        include: { book: true },
      });
    }

    if (!bookCopy) {
      throw AppError.notFound('Book copy not found');
    }

    if (bookCopy.status !== 'AVAILABLE') {
      throw AppError.badRequest(`Book copy is not available (status: ${bookCopy.status})`);
    }

    // Check if borrower can borrow
    const canBorrowResult = await this.canBorrow(data.borrowerId, data.borrowerType);
    if (!canBorrowResult.canBorrow) {
      throw AppError.badRequest(canBorrowResult.reason || 'Cannot borrow books');
    }

    // Calculate due date
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROWING_CONFIG.loanPeriodDays);

    // Create borrowing record and update copy status
    const borrowing = await prisma.$transaction(async (tx) => {
      // Create borrowing
      const newBorrowing = await tx.borrowing.create({
        data: {
          bookCopyId: bookCopy.id,
          borrowerId: data.borrowerId,
          borrowerType: data.borrowerType,
          borrowDate,
          dueDate,
          issuedById,
          status: 'ACTIVE',
        },
        include: {
          bookCopy: {
            include: {
              book: {
                select: { id: true, title: true, author: true },
              },
            },
          },
          borrower: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Update copy status
      await tx.bookCopy.update({
        where: { id: bookCopy.id },
        data: { status: 'BORROWED' },
      });

      // Update book available copies
      await tx.book.update({
        where: { id: bookCopy.bookId },
        data: {
          availableCopies: { decrement: 1 },
        },
      });

      return newBorrowing;
    });

    await auditService.log({
      action: 'CREATE',
      resource: 'Borrowing',
      resourceId: borrowing.id,
      userId: issuedById,
      newValues: { bookCopyId: bookCopy.id, borrowerId: data.borrowerId, dueDate },
    });

    return borrowing;
  }

  /**
   * Return a book
   */
  async returnBook(borrowingId: string, returnedToId: string, updateCondition?: string, waiveFee?: boolean, waiveReason?: string) {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        bookCopy: {
          include: { book: true },
        },
      },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing record not found');
    }

    if (borrowing.status === 'RETURNED') {
      throw AppError.badRequest('Book has already been returned');
    }

    const returnDate = new Date();
    const lateFee = this.calculateLateFeeAmount(borrowing.dueDate, returnDate);

    const updated = await prisma.$transaction(async (tx) => {
      // Update borrowing
      const updatedBorrowing = await tx.borrowing.update({
        where: { id: borrowingId },
        data: {
          returnDate,
          returnedToId,
          status: 'RETURNED',
          lateFee: lateFee > 0 ? lateFee : null,
          lateFeeStatus: lateFee > 0 ? (waiveFee ? 'WAIVED' : 'PENDING') : null,
          waivedById: waiveFee ? returnedToId : null,
          waiveReason: waiveFee ? waiveReason : null,
        },
        include: {
          bookCopy: {
            include: { book: { select: { id: true, title: true } } },
          },
          borrower: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Update copy status and condition
      await tx.bookCopy.update({
        where: { id: borrowing.bookCopyId },
        data: {
          status: 'AVAILABLE',
          condition: updateCondition as any || undefined,
        },
      });

      // Update book available copies
      await tx.book.update({
        where: { id: borrowing.bookCopy.bookId },
        data: {
          availableCopies: { increment: 1 },
        },
      });

      return updatedBorrowing;
    });

    // Process reservation queue
    await this.processReservationQueue(borrowing.bookCopy.bookId);

    await auditService.log({
      action: 'UPDATE',
      resource: 'Borrowing',
      resourceId: borrowingId,
      userId: returnedToId,
      oldValues: { status: borrowing.status },
      newValues: { status: 'RETURNED', returnDate, lateFee },
    });

    return updated;
  }

  /**
   * Return book by barcode
   */
  async returnByBarcode(barcode: string, returnedToId: string, updateCondition?: string, waiveFee?: boolean, waiveReason?: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    const borrowing = await prisma.borrowing.findFirst({
      where: {
        bookCopyId: copy.id,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
    });

    if (!borrowing) {
      throw AppError.badRequest('No active borrowing found for this book');
    }

    return this.returnBook(borrowing.id, returnedToId, updateCondition, waiveFee, waiveReason);
  }

  /**
   * Renew a book
   */
  async renewBook(borrowingId: string, renewedById?: string) {
    const canRenewResult = await this.canRenew(borrowingId);
    if (!canRenewResult.canRenew) {
      throw AppError.badRequest(canRenewResult.reason || 'Cannot renew this book');
    }

    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing record not found');
    }

    const newDueDate = new Date(borrowing.dueDate);
    newDueDate.setDate(newDueDate.getDate() + BORROWING_CONFIG.loanPeriodDays);

    const updated = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        dueDate: newDueDate,
        renewCount: { increment: 1 },
        status: 'ACTIVE', // Reset to active if it was overdue
      },
      include: {
        bookCopy: {
          include: { book: { select: { id: true, title: true } } },
        },
        borrower: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (renewedById) {
      await auditService.log({
        action: 'UPDATE',
        resource: 'Borrowing',
        resourceId: borrowingId,
        userId: renewedById,
        oldValues: { dueDate: borrowing.dueDate, renewCount: borrowing.renewCount },
        newValues: { dueDate: newDueDate, renewCount: updated.renewCount },
      });
    }

    return updated;
  }

  /**
   * Check if a book can be renewed
   */
  async canRenew(borrowingId: string): Promise<{ canRenew: boolean; reason?: string }> {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        bookCopy: {
          include: { book: true },
        },
      },
    });

    if (!borrowing) {
      return { canRenew: false, reason: 'Borrowing record not found' };
    }

    if (borrowing.status === 'RETURNED') {
      return { canRenew: false, reason: 'Book has already been returned' };
    }

    if (borrowing.status === 'LOST') {
      return { canRenew: false, reason: 'Book is marked as lost' };
    }

    if (borrowing.renewCount >= BORROWING_CONFIG.maxRenewals) {
      return { canRenew: false, reason: `Maximum renewals (${BORROWING_CONFIG.maxRenewals}) reached` };
    }

    // Check if overdue
    if (new Date() > borrowing.dueDate) {
      return { canRenew: false, reason: 'Cannot renew overdue books' };
    }

    // Check if there are pending reservations for this book
    const pendingReservations = await prisma.reservation.count({
      where: {
        bookId: borrowing.bookCopy.bookId,
        status: { in: ['PENDING', 'READY'] },
      },
    });

    if (pendingReservations > 0) {
      return { canRenew: false, reason: 'Book is reserved by other members' };
    }

    return { canRenew: true };
  }

  /**
   * Check if a member can borrow books
   */
  async canBorrow(borrowerId: string, borrowerType: string): Promise<{ canBorrow: boolean; reason?: string }> {
    const maxBooks = borrowerType === 'EMPLOYEE'
      ? BORROWING_CONFIG.employeeMaxBooks
      : BORROWING_CONFIG.studentMaxBooks;

    // Count active borrowings
    const activeBorrowings = await prisma.borrowing.count({
      where: {
        borrowerId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
    });

    if (activeBorrowings >= maxBooks) {
      return { canBorrow: false, reason: `Borrowing limit reached (${maxBooks} books)` };
    }

    // Check for overdue books
    const overdueBooks = await prisma.borrowing.count({
      where: {
        borrowerId,
        status: 'OVERDUE',
      },
    });

    if (overdueBooks > 0) {
      return { canBorrow: false, reason: 'Please return overdue books first' };
    }

    // Check for unpaid fines
    const unpaidFines = await prisma.borrowing.aggregate({
      where: {
        borrowerId,
        lateFeeStatus: 'PENDING',
      },
      _sum: { lateFee: true },
    });

    const totalUnpaid = unpaidFines._sum.lateFee?.toNumber() || 0;
    if (totalUnpaid > 10) { // Block if more than $10 unpaid
      return { canBorrow: false, reason: `Please pay outstanding fines ($${totalUnpaid.toFixed(2)})` };
    }

    return { canBorrow: true };
  }

  /**
   * Get borrowings with filters
   */
  async getBorrowings(filters: BorrowingFilters, page = 1, limit = 20) {
    const where: Prisma.BorrowingWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.borrowerId) {
      where.borrowerId = filters.borrowerId;
    }

    if (filters.borrowerType) {
      where.borrowerType = filters.borrowerType;
    }

    if (filters.isOverdue) {
      where.status = 'OVERDUE';
    }

    if (filters.dateFrom || filters.dateTo) {
      where.borrowDate = {};
      if (filters.dateFrom) {
        where.borrowDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.borrowDate.lte = filters.dateTo;
      }
    }

    const [borrowings, total] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        include: {
          bookCopy: {
            include: {
              book: { select: { id: true, title: true, author: true, isbn: true } },
            },
          },
          borrower: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          issuedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { borrowDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.borrowing.count({ where }),
    ]);

    return {
      data: borrowings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active borrowings for a member
   */
  async getActiveBorrowings(borrowerId: string) {
    return prisma.borrowing.findMany({
      where: {
        borrowerId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      include: {
        bookCopy: {
          include: {
            book: { select: { id: true, title: true, author: true, coverImage: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get overdue borrowings
   */
  async getOverdueBorrowings() {
    const now = new Date();
    return prisma.borrowing.findMany({
      where: {
        status: { in: ['ACTIVE', 'OVERDUE'] },
        dueDate: { lt: now },
      },
      include: {
        bookCopy: {
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        },
        borrower: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get borrowing history for a member
   */
  async getBorrowingHistory(borrowerId: string, page = 1, limit = 20) {
    const [borrowings, total] = await Promise.all([
      prisma.borrowing.findMany({
        where: { borrowerId },
        include: {
          bookCopy: {
            include: {
              book: { select: { id: true, title: true, author: true } },
            },
          },
        },
        orderBy: { borrowDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.borrowing.count({ where: { borrowerId } }),
    ]);

    return {
      data: borrowings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get borrowing by ID
   */
  async getBorrowingById(id: string) {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id },
      include: {
        bookCopy: {
          include: {
            book: {
              select: { id: true, title: true, author: true, isbn: true, coverImage: true },
            },
          },
        },
        borrower: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        issuedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        returnedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing record not found');
    }

    return borrowing;
  }

  /**
   * Calculate late fee amount
   */
  calculateLateFeeAmount(dueDate: Date, returnDate: Date): number {
    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= BORROWING_CONFIG.gracePeriodDays) {
      return 0;
    }

    const lateDays = diffDays - BORROWING_CONFIG.gracePeriodDays;
    return lateDays * BORROWING_CONFIG.lateFeePerDay;
  }

  /**
   * Waive late fee
   */
  async waiveLateFee(borrowingId: string, waivedById: string, reason: string) {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing record not found');
    }

    if (!borrowing.lateFee || borrowing.lateFeeStatus !== 'PENDING') {
      throw AppError.badRequest('No pending late fee to waive');
    }

    const updated = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        lateFeeStatus: 'WAIVED',
        waivedById,
        waiveReason: reason,
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Borrowing',
      resourceId: borrowingId,
      userId: waivedById,
      oldValues: { lateFeeStatus: 'PENDING' },
      newValues: { lateFeeStatus: 'WAIVED', waiveReason: reason },
    });

    return updated;
  }

  /**
   * Pay late fee
   */
  async payLateFee(borrowingId: string, paidById: string) {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing record not found');
    }

    if (!borrowing.lateFee || borrowing.lateFeeStatus !== 'PENDING') {
      throw AppError.badRequest('No pending late fee to pay');
    }

    const updated = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        lateFeeStatus: 'PAID',
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Borrowing',
      resourceId: borrowingId,
      userId: paidById,
      oldValues: { lateFeeStatus: 'PENDING' },
      newValues: { lateFeeStatus: 'PAID' },
    });

    return updated;
  }

  /**
   * Mark borrowings as overdue (for cron job)
   */
  async markOverdueBorrowings() {
    const now = new Date();

    const result = await prisma.borrowing.updateMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    return result.count;
  }

  /**
   * Get member statistics
   */
  async getMemberStats(borrowerId: string) {
    const [
      currentlyBorrowed,
      totalBorrowed,
      returnedLate,
      unpaidFines,
    ] = await Promise.all([
      prisma.borrowing.count({
        where: { borrowerId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      }),
      prisma.borrowing.count({
        where: { borrowerId },
      }),
      prisma.borrowing.count({
        where: { borrowerId, lateFee: { gt: 0 } },
      }),
      prisma.borrowing.aggregate({
        where: { borrowerId, lateFeeStatus: 'PENDING' },
        _sum: { lateFee: true },
      }),
    ]);

    return {
      currentlyBorrowed,
      totalBorrowed,
      returnedLate,
      unpaidFines: unpaidFines._sum.lateFee?.toNumber() || 0,
    };
  }

  /**
   * Process reservation queue when a book is returned
   */
  private async processReservationQueue(bookId: string) {
    // Find the next pending reservation
    const nextReservation = await prisma.reservation.findFirst({
      where: {
        bookId,
        status: 'PENDING',
      },
      orderBy: { reservedAt: 'asc' },
    });

    if (nextReservation) {
      // Update reservation to READY
      await prisma.reservation.update({
        where: { id: nextReservation.id },
        data: {
          status: 'READY',
          notifiedAt: new Date(),
          expiresAt: new Date(Date.now() + BORROWING_CONFIG.reservationHoldDays * 24 * 60 * 60 * 1000),
        },
      });

      // TODO: Send notification to user
    }
  }
}

export const borrowingService = new BorrowingService();
