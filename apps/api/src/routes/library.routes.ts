import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/index.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, sendSuccess, sendCreated, sendPaginated } from '../utils/index.js';
import { bookCategoryService } from '../services/bookCategory.service.js';
import { libraryLocationService } from '../services/libraryLocation.service.js';
import { bookService } from '../services/book.service.js';
import { bookCopyService } from '../services/bookCopy.service.js';
import { borrowingService } from '../services/borrowing.service.js';
import { reservationService } from '../services/reservation.service.js';
import {
  createBookCategorySchema,
  updateBookCategorySchema,
  createLibraryLocationSchema,
  updateLibraryLocationSchema,
  createBookSchema,
  updateBookSchema,
  bookQuerySchema,
  addCopiesSchema,
  removeCopiesSchema,
  createBookCopySchema,
  updateBookCopySchema,
  issueBookSchema,
  returnBookSchema,
  returnByBarcodeSchema,
  waiveFeeSchema,
  borrowingQuerySchema,
  createReservationSchema,
  reservationQuerySchema,
} from '../validators/library.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// ===========================================
// Book Category Routes
// ===========================================

/**
 * GET /api/v1/library/categories
 * Get all categories
 */
router.get(
  '/categories',
  authorize('books:read'),
  asyncHandler(async (_req, res) => {
    const categories = await bookCategoryService.getCategories();
    return sendSuccess(res, categories);
  })
);

/**
 * GET /api/v1/library/categories/tree
 * Get category tree (hierarchical)
 */
router.get(
  '/categories/tree',
  authorize('books:read'),
  asyncHandler(async (_req, res) => {
    const tree = await bookCategoryService.getCategoryTree();
    return sendSuccess(res, tree);
  })
);

/**
 * GET /api/v1/library/categories/:id
 * Get category by ID
 */
router.get(
  '/categories/:id',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const category = await bookCategoryService.getCategoryById(req.params.id);
    return sendSuccess(res, category);
  })
);

/**
 * POST /api/v1/library/categories
 * Create a new category
 */
router.post(
  '/categories',
  authorize('books:create'),
  validate(createBookCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await bookCategoryService.createCategory(req.body, req.user!.userId);
    return sendCreated(res, category);
  })
);

/**
 * PATCH /api/v1/library/categories/:id
 * Update a category
 */
router.patch(
  '/categories/:id',
  authorize('books:update'),
  validate(updateBookCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await bookCategoryService.updateCategory(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, category);
  })
);

/**
 * DELETE /api/v1/library/categories/:id
 * Delete a category
 */
router.delete(
  '/categories/:id',
  authorize('books:delete'),
  asyncHandler(async (req, res) => {
    await bookCategoryService.deleteCategory(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Category deleted');
  })
);

// ===========================================
// Library Location Routes
// ===========================================

/**
 * GET /api/v1/library/locations
 * Get all locations
 */
router.get(
  '/locations',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const locations = await libraryLocationService.getLocations(includeInactive);
    return sendSuccess(res, locations);
  })
);

/**
 * GET /api/v1/library/locations/:id
 * Get location by ID
 */
router.get(
  '/locations/:id',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const location = await libraryLocationService.getLocationById(req.params.id);
    return sendSuccess(res, location);
  })
);

/**
 * POST /api/v1/library/locations
 * Create a new location
 */
router.post(
  '/locations',
  authorize('books:create'),
  validate(createLibraryLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await libraryLocationService.createLocation(req.body, req.user!.userId);
    return sendCreated(res, location);
  })
);

/**
 * PATCH /api/v1/library/locations/:id
 * Update a location
 */
router.patch(
  '/locations/:id',
  authorize('books:update'),
  validate(updateLibraryLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await libraryLocationService.updateLocation(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, location);
  })
);

/**
 * DELETE /api/v1/library/locations/:id
 * Delete a location
 */
router.delete(
  '/locations/:id',
  authorize('books:delete'),
  asyncHandler(async (req, res) => {
    await libraryLocationService.deleteLocation(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Location deleted');
  })
);

// ===========================================
// Book Routes
// ===========================================

/**
 * GET /api/v1/library/books
 * Get all books with filters
 */
router.get(
  '/books',
  authorize('books:read'),
  validate(bookQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, search, categoryId, locationId, status, language } = req.query;
    const result = await bookService.getBooks(
      {
        search: search as string,
        categoryId: categoryId as string,
        locationId: locationId as string,
        status: status as any,
        language: language as string,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * GET /api/v1/library/books/search
 * Search books
 */
router.get(
  '/books/search',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const { q, categoryId, locationId, limit } = req.query;
    if (!q) {
      return sendSuccess(res, []);
    }
    const books = await bookService.searchBooks(
      q as string,
      {
        categoryId: categoryId as string,
        locationId: locationId as string,
      },
      parseInt(limit as string) || 50
    );
    return sendSuccess(res, books);
  })
);

/**
 * GET /api/v1/library/books/new-arrivals
 * Get new arrivals
 */
router.get(
  '/books/new-arrivals',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const books = await bookService.getNewArrivals(parseInt(limit as string) || 10);
    return sendSuccess(res, books);
  })
);

/**
 * GET /api/v1/library/books/popular
 * Get popular books
 */
router.get(
  '/books/popular',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const books = await bookService.getPopularBooks(parseInt(limit as string) || 10);
    return sendSuccess(res, books);
  })
);

/**
 * GET /api/v1/library/books/low-stock
 * Get low stock books
 */
router.get(
  '/books/low-stock',
  authorize('books:read'),
  asyncHandler(async (_req, res) => {
    const books = await bookService.getLowStockBooks();
    return sendSuccess(res, books);
  })
);

/**
 * GET /api/v1/library/books/inventory
 * Get inventory report
 */
router.get(
  '/books/inventory',
  authorize('books:read'),
  asyncHandler(async (_req, res) => {
    const report = await bookService.getInventoryReport();
    return sendSuccess(res, report);
  })
);

/**
 * GET /api/v1/library/books/isbn/:isbn
 * Get book by ISBN
 */
router.get(
  '/books/isbn/:isbn',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const book = await bookService.getBookByISBN(req.params.isbn);
    return sendSuccess(res, book);
  })
);

/**
 * GET /api/v1/library/books/:id
 * Get book by ID
 */
router.get(
  '/books/:id',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const book = await bookService.getBookById(req.params.id);
    return sendSuccess(res, book);
  })
);

/**
 * POST /api/v1/library/books
 * Create a new book
 */
router.post(
  '/books',
  authorize('books:create'),
  validate(createBookSchema),
  asyncHandler(async (req, res) => {
    const book = await bookService.createBook(req.body, req.user!.userId);
    return sendCreated(res, book);
  })
);

/**
 * PATCH /api/v1/library/books/:id
 * Update a book
 */
router.patch(
  '/books/:id',
  authorize('books:update'),
  validate(updateBookSchema),
  asyncHandler(async (req, res) => {
    const book = await bookService.updateBook(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, book);
  })
);

/**
 * DELETE /api/v1/library/books/:id
 * Delete a book
 */
router.delete(
  '/books/:id',
  authorize('books:delete'),
  asyncHandler(async (req, res) => {
    await bookService.deleteBook(req.params.id, req.user!.userId);
    return sendSuccess(res, null, 'Book deleted');
  })
);

/**
 * POST /api/v1/library/books/:id/add-copies
 * Add copies to a book
 */
router.post(
  '/books/:id/add-copies',
  authorize('books:update'),
  validate(addCopiesSchema),
  asyncHandler(async (req, res) => {
    const { quantity, condition, acquisitionType, notes } = req.body;
    const copies = await bookService.addCopies(
      req.params.id,
      quantity,
      condition,
      acquisitionType,
      notes,
      req.user!.userId
    );
    return sendSuccess(res, copies, `Added ${quantity} copies`);
  })
);

/**
 * POST /api/v1/library/books/:id/remove-copies
 * Remove copies from a book
 */
router.post(
  '/books/:id/remove-copies',
  authorize('books:update'),
  validate(removeCopiesSchema),
  asyncHandler(async (req, res) => {
    const { quantity, reason } = req.body;
    await bookService.removeCopies(req.params.id, quantity, reason, req.user!.userId);
    return sendSuccess(res, null, `Removed ${quantity} copies`);
  })
);

// ===========================================
// Book Copy Routes
// ===========================================

/**
 * GET /api/v1/library/books/:id/copies
 * Get all copies of a book
 */
router.get(
  '/books/:id/copies',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const copies = await bookCopyService.getBookCopies(req.params.id);
    return sendSuccess(res, copies);
  })
);

/**
 * POST /api/v1/library/books/:id/copies
 * Add a single copy to a book
 */
router.post(
  '/books/:id/copies',
  authorize('books:create'),
  validate(createBookCopySchema),
  asyncHandler(async (req, res) => {
    const copy = await bookCopyService.createCopy(req.params.id, req.body);

    // Update book totals
    await bookService.addCopies(
      req.params.id,
      1,
      req.body.condition || 'GOOD',
      req.body.acquisitionType || 'PURCHASE',
      req.body.notes,
      req.user!.userId
    );

    return sendCreated(res, copy);
  })
);

/**
 * GET /api/v1/library/copies/barcode/:barcode
 * Get copy by barcode
 */
router.get(
  '/copies/barcode/:barcode',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const copy = await bookCopyService.getCopyByBarcode(req.params.barcode);
    return sendSuccess(res, copy);
  })
);

/**
 * GET /api/v1/library/copies/:id
 * Get copy by ID
 */
router.get(
  '/copies/:id',
  authorize('books:read'),
  asyncHandler(async (req, res) => {
    const copy = await bookCopyService.getCopyById(req.params.id);
    return sendSuccess(res, copy);
  })
);

/**
 * PATCH /api/v1/library/copies/:id
 * Update a book copy
 */
router.patch(
  '/copies/:id',
  authorize('books:update'),
  validate(updateBookCopySchema),
  asyncHandler(async (req, res) => {
    const copy = await bookCopyService.updateCopy(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, copy);
  })
);

/**
 * POST /api/v1/library/copies/:id/mark-lost
 * Mark a copy as lost
 */
router.post(
  '/copies/:id/mark-lost',
  authorize('books:update'),
  asyncHandler(async (req, res) => {
    const { borrowingId } = req.body;
    await bookCopyService.markAsLost(req.params.id, borrowingId, req.user!.userId);
    return sendSuccess(res, null, 'Copy marked as lost');
  })
);

// ===========================================
// Borrowing Routes
// ===========================================

/**
 * GET /api/v1/library/borrowings
 * Get all borrowings with filters
 */
router.get(
  '/borrowings',
  authorize('borrowings:read'),
  validate(borrowingQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, borrowerId, borrowerType, isOverdue, dateFrom, dateTo } = req.query;
    const result = await borrowingService.getBorrowings(
      {
        status: status as any,
        borrowerId: borrowerId as string,
        borrowerType: borrowerType as string,
        isOverdue: isOverdue === 'true',
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * GET /api/v1/library/borrowings/overdue
 * Get overdue borrowings
 */
router.get(
  '/borrowings/overdue',
  authorize('borrowings:read'),
  asyncHandler(async (_req, res) => {
    const borrowings = await borrowingService.getOverdueBorrowings();
    return sendSuccess(res, borrowings);
  })
);

/**
 * GET /api/v1/library/borrowings/member/:memberId
 * Get active borrowings for a member
 */
router.get(
  '/borrowings/member/:memberId',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const borrowings = await borrowingService.getActiveBorrowings(req.params.memberId);
    return sendSuccess(res, borrowings);
  })
);

/**
 * GET /api/v1/library/borrowings/member/:memberId/history
 * Get borrowing history for a member
 */
router.get(
  '/borrowings/member/:memberId/history',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await borrowingService.getBorrowingHistory(
      req.params.memberId,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * GET /api/v1/library/borrowings/member/:memberId/stats
 * Get member statistics
 */
router.get(
  '/borrowings/member/:memberId/stats',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const stats = await borrowingService.getMemberStats(req.params.memberId);
    return sendSuccess(res, stats);
  })
);

/**
 * GET /api/v1/library/borrowings/:id
 * Get borrowing by ID
 */
router.get(
  '/borrowings/:id',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const borrowing = await borrowingService.getBorrowingById(req.params.id);
    return sendSuccess(res, borrowing);
  })
);

/**
 * POST /api/v1/library/borrowings/issue
 * Issue a book to a member
 */
router.post(
  '/borrowings/issue',
  authorize('borrowings:create'),
  validate(issueBookSchema),
  asyncHandler(async (req, res) => {
    const borrowing = await borrowingService.issueBook(req.body, req.user!.userId);
    return sendCreated(res, borrowing);
  })
);

/**
 * POST /api/v1/library/borrowings/:id/return
 * Return a borrowed book
 */
router.post(
  '/borrowings/:id/return',
  authorize('borrowings:update'),
  validate(returnBookSchema),
  asyncHandler(async (req, res) => {
    const { condition, waiveFee, waiveReason } = req.body;
    const borrowing = await borrowingService.returnBook(
      req.params.id,
      req.user!.userId,
      condition,
      waiveFee,
      waiveReason
    );
    return sendSuccess(res, borrowing, 'Book returned successfully');
  })
);

/**
 * POST /api/v1/library/borrowings/return-by-barcode
 * Return a book by scanning barcode
 */
router.post(
  '/borrowings/return-by-barcode',
  authorize('borrowings:update'),
  validate(returnByBarcodeSchema),
  asyncHandler(async (req, res) => {
    const { barcode, condition, waiveFee, waiveReason } = req.body;
    const borrowing = await borrowingService.returnByBarcode(
      barcode,
      req.user!.userId,
      condition,
      waiveFee,
      waiveReason
    );
    return sendSuccess(res, borrowing, 'Book returned successfully');
  })
);

/**
 * POST /api/v1/library/borrowings/:id/renew
 * Renew a borrowed book
 */
router.post(
  '/borrowings/:id/renew',
  authorize('borrowings:update'),
  asyncHandler(async (req, res) => {
    const borrowing = await borrowingService.renewBook(req.params.id, req.user!.userId);
    return sendSuccess(res, borrowing, 'Book renewed successfully');
  })
);

/**
 * GET /api/v1/library/borrowings/:id/can-renew
 * Check if a book can be renewed
 */
router.get(
  '/borrowings/:id/can-renew',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const result = await borrowingService.canRenew(req.params.id);
    return sendSuccess(res, result);
  })
);

/**
 * POST /api/v1/library/borrowings/:id/waive-fee
 * Waive late fee for a borrowing
 */
router.post(
  '/borrowings/:id/waive-fee',
  authorize('borrowings:update'),
  validate(waiveFeeSchema),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const borrowing = await borrowingService.waiveLateFee(
      req.params.id,
      req.user!.userId,
      reason
    );
    return sendSuccess(res, borrowing, 'Late fee waived');
  })
);

/**
 * POST /api/v1/library/borrowings/:id/pay-fee
 * Mark late fee as paid
 */
router.post(
  '/borrowings/:id/pay-fee',
  authorize('borrowings:update'),
  asyncHandler(async (req, res) => {
    const borrowing = await borrowingService.payLateFee(req.params.id, req.user!.userId);
    return sendSuccess(res, borrowing, 'Late fee paid');
  })
);

/**
 * GET /api/v1/library/members/:memberId/can-borrow
 * Check if a member can borrow books
 */
router.get(
  '/members/:memberId/can-borrow',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const { borrowerType } = req.query;
    const result = await borrowingService.canBorrow(
      req.params.memberId,
      (borrowerType as string) || 'STUDENT'
    );
    return sendSuccess(res, result);
  })
);

// ===========================================
// Reservation Routes
// ===========================================

/**
 * GET /api/v1/library/reservations
 * Get all reservations with filters
 */
router.get(
  '/reservations',
  authorize('borrowings:read'),
  validate(reservationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, userId, bookId } = req.query;
    const result = await reservationService.getReservations(
      {
        status: status as any,
        userId: userId as string,
        bookId: bookId as string,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendPaginated(res, result.data, result.pagination);
  })
);

/**
 * GET /api/v1/library/reservations/ready-for-pickup
 * Get reservations ready for pickup
 */
router.get(
  '/reservations/ready-for-pickup',
  authorize('borrowings:read'),
  asyncHandler(async (_req, res) => {
    const reservations = await reservationService.getReadyForPickup();
    return sendSuccess(res, reservations);
  })
);

/**
 * GET /api/v1/library/reservations/user/:userId
 * Get reservations for a user
 */
router.get(
  '/reservations/user/:userId',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const reservations = await reservationService.getUserReservations(req.params.userId);
    return sendSuccess(res, reservations);
  })
);

/**
 * GET /api/v1/library/reservations/book/:bookId
 * Get reservations for a book
 */
router.get(
  '/reservations/book/:bookId',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const reservations = await reservationService.getBookReservations(req.params.bookId);
    return sendSuccess(res, reservations);
  })
);

/**
 * GET /api/v1/library/reservations/:id
 * Get reservation by ID
 */
router.get(
  '/reservations/:id',
  authorize('borrowings:read'),
  asyncHandler(async (req, res) => {
    const reservation = await reservationService.getReservationById(req.params.id);
    return sendSuccess(res, reservation);
  })
);

/**
 * POST /api/v1/library/reservations
 * Create a reservation
 */
router.post(
  '/reservations',
  authorize('borrowings:create'),
  validate(createReservationSchema),
  asyncHandler(async (req, res) => {
    const { bookId } = req.body;
    const reservation = await reservationService.reserveBook(bookId, req.user!.userId);
    return sendCreated(res, reservation);
  })
);

/**
 * DELETE /api/v1/library/reservations/:id
 * Cancel a reservation
 */
router.delete(
  '/reservations/:id',
  authorize('borrowings:delete'),
  asyncHandler(async (req, res) => {
    await reservationService.cancelReservation(req.params.id, req.user!.userId, true);
    return sendSuccess(res, null, 'Reservation cancelled');
  })
);

/**
 * POST /api/v1/library/reservations/:id/fulfill
 * Fulfill a reservation (book issued to reserved user)
 */
router.post(
  '/reservations/:id/fulfill',
  authorize('borrowings:update'),
  asyncHandler(async (req, res) => {
    const reservation = await reservationService.fulfillReservation(
      req.params.id,
      req.user!.userId
    );
    return sendSuccess(res, reservation, 'Reservation fulfilled');
  })
);

export default router;
