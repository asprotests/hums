import { z } from 'zod';

// ===========================================
// Book Category Validators
// ===========================================

export const createBookCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameLocal: z.string().optional(),
  code: z.string().min(1, 'Code is required').max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export const updateBookCategorySchema = z.object({
  name: z.string().min(1).optional(),
  nameLocal: z.string().optional(),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
});

// ===========================================
// Library Location Validators
// ===========================================

export const createLibraryLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  building: z.string().optional(),
  floor: z.string().optional(),
  section: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
});

export const updateLibraryLocationSchema = z.object({
  name: z.string().min(1).optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  section: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ===========================================
// Book Validators
// ===========================================

export const createBookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  titleLocal: z.string().optional(),
  author: z.string().min(1, 'Author is required'),
  coAuthors: z.array(z.string()).optional().default([]),
  publisher: z.string().optional(),
  publishYear: z.number().int().min(1800).max(2100).optional(),
  edition: z.string().optional(),
  language: z.string().optional().default('English'),
  pages: z.number().int().min(1).optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  locationId: z.string().uuid('Invalid location ID').optional(),
  shelfNumber: z.string().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  totalCopies: z.number().int().min(1).optional().default(1),
});

export const updateBookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1).optional(),
  titleLocal: z.string().optional(),
  author: z.string().min(1).optional(),
  coAuthors: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  publishYear: z.number().int().min(1800).max(2100).optional(),
  edition: z.string().optional(),
  language: z.string().optional(),
  pages: z.number().int().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().nullable().optional(),
  shelfNumber: z.string().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const bookQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
  language: z.string().optional(),
});

export const addCopiesSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).optional().default('NEW'),
  acquisitionType: z.enum(['PURCHASE', 'DONATION', 'TRANSFER']).optional().default('PURCHASE'),
  notes: z.string().optional(),
});

export const removeCopiesSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
});

// ===========================================
// Book Copy Validators
// ===========================================

export const createBookCopySchema = z.object({
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional().default('GOOD'),
  acquisitionType: z.enum(['PURCHASE', 'DONATION', 'TRANSFER']).optional().default('PURCHASE'),
  notes: z.string().optional(),
});

export const updateBookCopySchema = z.object({
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  status: z.enum(['AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST', 'RETIRED']).optional(),
  notes: z.string().optional(),
});

// ===========================================
// Borrowing Validators
// ===========================================

export const issueBookSchema = z.object({
  bookCopyId: z.string().uuid().optional(),
  barcode: z.string().optional(),
  borrowerId: z.string().uuid('Invalid borrower ID'),
  borrowerType: z.enum(['STUDENT', 'EMPLOYEE']),
}).refine(data => data.bookCopyId || data.barcode, {
  message: 'Either bookCopyId or barcode is required',
});

export const returnBookSchema = z.object({
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  notes: z.string().optional(),
  waiveFee: z.boolean().optional().default(false),
  waiveReason: z.string().optional(),
}).refine(data => !data.waiveFee || data.waiveReason, {
  message: 'Waive reason is required when waiving fee',
  path: ['waiveReason'],
});

export const returnByBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  notes: z.string().optional(),
  waiveFee: z.boolean().optional().default(false),
  waiveReason: z.string().optional(),
}).refine(data => !data.waiveFee || data.waiveReason, {
  message: 'Waive reason is required when waiving fee',
  path: ['waiveReason'],
});

export const waiveFeeSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const borrowingQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['ACTIVE', 'RETURNED', 'OVERDUE', 'LOST']).optional(),
  borrowerId: z.string().uuid().optional(),
  borrowerType: z.enum(['STUDENT', 'EMPLOYEE']).optional(),
  isOverdue: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ===========================================
// Reservation Validators
// ===========================================

export const createReservationSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
});

export const reservationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['PENDING', 'READY', 'FULFILLED', 'EXPIRED', 'CANCELLED']).optional(),
  userId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
});
