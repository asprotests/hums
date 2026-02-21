import { prisma, Prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';
import { bookCopyService } from './bookCopy.service.js';

export interface CreateBookInput {
  isbn?: string;
  title: string;
  titleLocal?: string;
  author: string;
  coAuthors?: string[];
  publisher?: string;
  publishYear?: number;
  edition?: string;
  language?: string;
  pages?: number;
  categoryId: string;
  locationId?: string;
  shelfNumber?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  totalCopies?: number;
}

export interface UpdateBookInput {
  isbn?: string;
  title?: string;
  titleLocal?: string;
  author?: string;
  coAuthors?: string[];
  publisher?: string;
  publishYear?: number;
  edition?: string;
  language?: string;
  pages?: number;
  categoryId?: string;
  locationId?: string | null;
  shelfNumber?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
}

export interface BookFilters {
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  language?: string;
}

type BookStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';

class BookService {
  /**
   * Calculate book status based on available copies
   */
  private calculateStatus(availableCopies: number, totalCopies: number): BookStatus {
    if (totalCopies === 0) return 'DISCONTINUED';
    if (availableCopies === 0) return 'OUT_OF_STOCK';
    if (availableCopies < 2) return 'LOW_STOCK';
    return 'AVAILABLE';
  }

  /**
   * Get all books with pagination
   */
  async getBooks(filters: BookFilters, page: number = 1, limit: number = 20) {
    const where: Prisma.BookWhereInput = {
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { author: { contains: filters.search, mode: 'insensitive' } },
        { isbn: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.language) {
      where.language = filters.language;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, section: true } },
          _count: { select: { copies: true } },
        },
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.book.count({ where }),
    ]);

    return {
      data: books.map(book => ({
        ...book,
        copyCount: book._count.copies,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get book by ID
   */
  async getBookById(id: string) {
    const book = await prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, nameLocal: true, code: true } },
        location: { select: { id: true, name: true, building: true, floor: true, section: true } },
        copies: {
          orderBy: { copyNumber: 'asc' },
          include: {
            borrowings: {
              where: { status: 'ACTIVE' },
              include: {
                borrower: {
                  select: { firstName: true, lastName: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    return book;
  }

  /**
   * Get book by ISBN
   */
  async getBookByISBN(isbn: string) {
    const book = await prisma.book.findFirst({
      where: { isbn, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, section: true } },
      },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    return book;
  }

  /**
   * Search books
   */
  async searchBooks(query: string, filters?: BookFilters, limit: number = 50) {
    const where: Prisma.BookWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { isbn: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { title: 'asc' },
      take: limit,
    });

    return books;
  }

  /**
   * Get new arrivals (recently added books)
   */
  async getNewArrivals(limit: number = 10) {
    return prisma.book.findMany({
      where: { deletedAt: null },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get popular books (most borrowed)
   */
  async getPopularBooks(limit: number = 10) {
    // Get books with their borrowing counts through copies
    const booksWithBorrowCounts = await prisma.$queryRaw<Array<{ id: string; borrowCount: bigint }>>`
      SELECT b.id, COALESCE(COUNT(br.id), 0) as "borrowCount"
      FROM books b
      LEFT JOIN book_copies bc ON bc.book_id = b.id
      LEFT JOIN borrowings br ON br.book_copy_id = bc.id
      WHERE b.deleted_at IS NULL
      GROUP BY b.id
      ORDER BY "borrowCount" DESC
      LIMIT ${limit}
    `;

    const bookIds = booksWithBorrowCounts.map(b => b.id);

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // Merge borrow counts with books
    const borrowCountMap = new Map(booksWithBorrowCounts.map(b => [b.id, Number(b.borrowCount)]));
    return books
      .map(book => ({
        ...book,
        borrowCount: borrowCountMap.get(book.id) || 0,
      }))
      .sort((a, b) => b.borrowCount - a.borrowCount);
  }

  /**
   * Get low stock books
   */
  async getLowStockBooks() {
    return prisma.book.findMany({
      where: {
        deletedAt: null,
        status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { availableCopies: 'asc' },
    });
  }

  /**
   * Create a new book
   */
  async createBook(data: CreateBookInput, userId: string) {
    // Check for duplicate ISBN
    if (data.isbn) {
      const existing = await prisma.book.findFirst({
        where: { isbn: data.isbn, deletedAt: null },
      });
      if (existing) {
        throw AppError.badRequest('A book with this ISBN already exists');
      }
    }

    // Validate category exists
    const category = await prisma.bookCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw AppError.badRequest('Category not found');
    }

    // Validate location exists if provided
    if (data.locationId) {
      const location = await prisma.libraryLocation.findUnique({
        where: { id: data.locationId },
      });
      if (!location) {
        throw AppError.badRequest('Location not found');
      }
    }

    const totalCopies = data.totalCopies || 1;

    const book = await prisma.book.create({
      data: {
        isbn: data.isbn,
        title: data.title,
        titleLocal: data.titleLocal,
        author: data.author,
        coAuthors: data.coAuthors || [],
        publisher: data.publisher,
        publishYear: data.publishYear,
        edition: data.edition,
        language: data.language || 'English',
        pages: data.pages,
        categoryId: data.categoryId,
        locationId: data.locationId,
        shelfNumber: data.shelfNumber,
        coverImage: data.coverImage,
        description: data.description,
        tags: data.tags || [],
        totalCopies,
        availableCopies: totalCopies,
        status: this.calculateStatus(totalCopies, totalCopies),
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // Create book copies
    for (let i = 1; i <= totalCopies; i++) {
      await bookCopyService.createCopy(book.id, {
        condition: 'NEW',
        acquisitionType: 'PURCHASE',
      });
    }

    await auditService.log({
      action: 'CREATE',
      resource: 'Book',
      resourceId: book.id,
      userId,
      newValues: data,
    });

    return book;
  }

  /**
   * Update a book
   */
  async updateBook(id: string, data: UpdateBookInput, userId: string) {
    const book = await prisma.book.findFirst({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // Check for duplicate ISBN
    if (data.isbn && data.isbn !== book.isbn) {
      const existing = await prisma.book.findFirst({
        where: { isbn: data.isbn, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw AppError.badRequest('A book with this ISBN already exists');
      }
    }

    // Validate category if changing
    if (data.categoryId && data.categoryId !== book.categoryId) {
      const category = await prisma.bookCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw AppError.badRequest('Category not found');
      }
    }

    // Validate location if changing
    if (data.locationId && data.locationId !== book.locationId) {
      const location = await prisma.libraryLocation.findUnique({
        where: { id: data.locationId },
      });
      if (!location) {
        throw AppError.badRequest('Location not found');
      }
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        isbn: data.isbn,
        title: data.title,
        titleLocal: data.titleLocal,
        author: data.author,
        coAuthors: data.coAuthors,
        publisher: data.publisher,
        publishYear: data.publishYear,
        edition: data.edition,
        language: data.language,
        pages: data.pages,
        categoryId: data.categoryId,
        locationId: data.locationId,
        shelfNumber: data.shelfNumber,
        coverImage: data.coverImage,
        description: data.description,
        tags: data.tags,
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Book',
      resourceId: id,
      userId,
      oldValues: book,
      newValues: data,
    });

    return updated;
  }

  /**
   * Delete a book (soft delete)
   */
  async deleteBook(id: string, userId: string) {
    const book = await prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: {
        copies: {
          include: {
            borrowings: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // Check if any copy has active borrowings
    const hasActiveBorrowings = book.copies.some(copy => copy.borrowings.length > 0);
    if (hasActiveBorrowings) {
      throw AppError.badRequest('Cannot delete book with active borrowings');
    }

    await prisma.book.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      action: 'DELETE',
      resource: 'Book',
      resourceId: id,
      userId,
      oldValues: book,
    });
  }

  /**
   * Add copies to a book
   */
  async addCopies(
    bookId: string,
    quantity: number,
    condition: string,
    acquisitionType: string,
    notes: string | undefined,
    userId: string
  ) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // Create book copies
    const copies = [];
    for (let i = 0; i < quantity; i++) {
      const copy = await bookCopyService.createCopy(bookId, {
        condition: condition as any,
        acquisitionType: acquisitionType as any,
        notes,
      });
      copies.push(copy);
    }

    // Update book counts
    const newTotal = book.totalCopies + quantity;
    const newAvailable = book.availableCopies + quantity;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        totalCopies: newTotal,
        availableCopies: newAvailable,
        status: this.calculateStatus(newAvailable, newTotal),
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Book',
      resourceId: bookId,
      userId,
      newValues: { action: 'add_copies', quantity, condition, acquisitionType },
    });

    return copies;
  }

  /**
   * Remove copies from a book
   */
  async removeCopies(bookId: string, quantity: number, reason: string, userId: string) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // Get available copies to remove
    const availableCopies = await prisma.bookCopy.findMany({
      where: {
        bookId,
        status: 'AVAILABLE',
      },
      take: quantity,
    });

    if (availableCopies.length < quantity) {
      throw AppError.badRequest(
        `Cannot remove ${quantity} copies. Only ${availableCopies.length} available copies exist.`
      );
    }

    // Mark copies as retired
    await prisma.bookCopy.updateMany({
      where: {
        id: { in: availableCopies.map(c => c.id) },
      },
      data: {
        status: 'RETIRED',
        notes: reason,
      },
    });

    // Update book counts
    const newTotal = book.totalCopies - quantity;
    const newAvailable = book.availableCopies - quantity;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        totalCopies: newTotal,
        availableCopies: newAvailable,
        status: this.calculateStatus(newAvailable, newTotal),
      },
    });

    await auditService.log({
      action: 'UPDATE',
      resource: 'Book',
      resourceId: bookId,
      userId,
      oldValues: { totalCopies: book.totalCopies, availableCopies: book.availableCopies },
      newValues: { action: 'remove_copies', quantity, reason, totalCopies: newTotal, availableCopies: newAvailable },
    });
  }

  /**
   * Get inventory report
   */
  async getInventoryReport() {
    const [totalBooks, totalCopies, availableCopies, borrowedCopies, categoryStats] =
      await Promise.all([
        prisma.book.count({ where: { deletedAt: null } }),
        prisma.book.aggregate({
          where: { deletedAt: null },
          _sum: { totalCopies: true },
        }),
        prisma.book.aggregate({
          where: { deletedAt: null },
          _sum: { availableCopies: true },
        }),
        prisma.bookCopy.count({ where: { status: 'BORROWED' } }),
        prisma.bookCategory.findMany({
          include: {
            _count: { select: { books: true } },
          },
        }),
      ]);

    const statusCounts = await prisma.book.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });

    return {
      totalBooks,
      totalCopies: totalCopies._sum.totalCopies || 0,
      availableCopies: availableCopies._sum.availableCopies || 0,
      borrowedCopies,
      byStatus: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: curr._count }),
        {}
      ),
      byCategory: categoryStats.map(cat => ({
        id: cat.id,
        name: cat.name,
        bookCount: cat._count.books,
      })),
    };
  }

  /**
   * Update available copies count (called when borrowing/returning)
   */
  async updateAvailableCopies(bookId: string, delta: number) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return;

    const newAvailable = Math.max(0, Math.min(book.totalCopies, book.availableCopies + delta));

    await prisma.book.update({
      where: { id: bookId },
      data: {
        availableCopies: newAvailable,
        status: this.calculateStatus(newAvailable, book.totalCopies),
      },
    });
  }
}

export const bookService = new BookService();
