import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';

type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE' | 'LOST' | 'RETIRED';

export interface CreateCopyInput {
  condition?: CopyCondition;
  acquisitionType?: 'PURCHASE' | 'DONATION' | 'TRANSFER';
  notes?: string;
}

export interface UpdateCopyInput {
  condition?: CopyCondition;
  status?: CopyStatus;
  notes?: string;
}

class BookCopyService {
  /**
   * Generate barcode for a book copy
   */
  private generateBarcode(_bookId: string, _copyNumber: string): string {
    const prefix = 'LIB';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const random = Math.random().toString(36).slice(-4).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  /**
   * Get next copy number for a book
   */
  private async getNextCopyNumber(bookId: string): Promise<string> {
    const lastCopy = await prisma.bookCopy.findFirst({
      where: { bookId },
      orderBy: { copyNumber: 'desc' },
    });

    if (!lastCopy) {
      return '001';
    }

    const nextNum = parseInt(lastCopy.copyNumber, 10) + 1;
    return nextNum.toString().padStart(3, '0');
  }

  /**
   * Get all copies of a book
   */
  async getBookCopies(bookId: string) {
    const copies = await prisma.bookCopy.findMany({
      where: { bookId },
      include: {
        borrowings: {
          where: { status: 'ACTIVE' },
          include: {
            borrower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { copyNumber: 'asc' },
    });

    return copies.map(copy => ({
      ...copy,
      currentBorrower: copy.borrowings[0]?.borrower || null,
      borrowings: undefined,
    }));
  }

  /**
   * Get copy by barcode
   */
  async getCopyByBarcode(barcode: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode },
      include: {
        book: {
          include: {
            category: { select: { id: true, name: true, code: true } },
            location: { select: { id: true, name: true } },
          },
        },
        borrowings: {
          where: { status: 'ACTIVE' },
          include: {
            borrower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    return {
      ...copy,
      currentBorrower: copy.borrowings[0]?.borrower || null,
    };
  }

  /**
   * Get copy by ID
   */
  async getCopyById(id: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id },
      include: {
        book: {
          include: {
            category: { select: { id: true, name: true, code: true } },
            location: { select: { id: true, name: true } },
          },
        },
        borrowings: {
          where: { status: 'ACTIVE' },
          include: {
            borrower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    return {
      ...copy,
      currentBorrower: copy.borrowings[0]?.borrower || null,
    };
  }

  /**
   * Create a new book copy
   */
  async createCopy(bookId: string, data: CreateCopyInput) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    const copyNumber = await this.getNextCopyNumber(bookId);
    const barcode = this.generateBarcode(bookId, copyNumber);

    const copy = await prisma.bookCopy.create({
      data: {
        bookId,
        copyNumber,
        barcode,
        condition: data.condition || 'GOOD',
        acquisitionType: data.acquisitionType || 'PURCHASE',
        notes: data.notes,
      },
    });

    return copy;
  }

  /**
   * Update copy status
   */
  async updateCopyStatus(copyId: string, status: CopyStatus, userId?: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id: copyId },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    const updated = await prisma.bookCopy.update({
      where: { id: copyId },
      data: { status },
    });

    if (userId) {
      await auditService.log({
        action: 'UPDATE',
        resource: 'BookCopy',
        resourceId: copyId,
        userId,
        oldValues: { status: copy.status },
        newValues: { status },
      });
    }

    return updated;
  }

  /**
   * Update copy condition
   */
  async updateCopyCondition(copyId: string, condition: CopyCondition, userId?: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id: copyId },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    const updated = await prisma.bookCopy.update({
      where: { id: copyId },
      data: { condition },
    });

    if (userId) {
      await auditService.log({
        action: 'UPDATE',
        resource: 'BookCopy',
        resourceId: copyId,
        userId,
        oldValues: { condition: copy.condition },
        newValues: { condition },
      });
    }

    return updated;
  }

  /**
   * Update book copy
   */
  async updateCopy(id: string, data: UpdateCopyInput, userId: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    const updated = await prisma.bookCopy.update({
      where: { id },
      data: {
        condition: data.condition,
        status: data.status,
        notes: data.notes,
      },
      include: {
        book: { select: { id: true, title: true } },
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'BookCopy',
      resourceId: id,
      userId,
      oldValues: copy,
      newValues: data,
    });

    return updated;
  }

  /**
   * Mark a copy as lost
   */
  async markAsLost(copyId: string, borrowingId: string | undefined, userId: string) {
    const copy = await prisma.bookCopy.findUnique({
      where: { id: copyId },
      include: { book: true },
    });

    if (!copy) {
      throw AppError.notFound('Book copy not found');
    }

    await prisma.$transaction(async (tx) => {
      // Update copy status
      await tx.bookCopy.update({
        where: { id: copyId },
        data: {
          status: 'LOST',
          notes: `Marked as lost on ${new Date().toISOString()}`,
        },
      });

      // Update borrowing if provided
      if (borrowingId) {
        await tx.borrowing.update({
          where: { id: borrowingId },
          data: { status: 'LOST' },
        });
      }

      // Update book available copies
      await tx.book.update({
        where: { id: copy.bookId },
        data: {
          availableCopies: { decrement: 1 },
          totalCopies: { decrement: 1 },
        },
      });
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'BookCopy',
      resourceId: copyId,
      userId,
      oldValues: { status: copy.status },
      newValues: { action: 'mark_lost', status: 'LOST' },
    });
  }

  /**
   * Get copies by status
   */
  async getCopiesByStatus(status: CopyStatus) {
    return prisma.bookCopy.findMany({
      where: { status },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
          },
        },
      },
    });
  }
}

export const bookCopyService = new BookCopyService();
