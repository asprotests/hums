import api, { type ApiResponse } from '../api';

// ===========================================
// Book Category Types
// ===========================================

export interface BookCategory {
  id: string;
  name: string;
  nameLocal: string | null;
  code: string;
  parentId: string | null;
  description: string | null;
  bookCount: number;
  parent?: { id: string; name: string; code: string } | null;
  children?: BookCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  nameLocal: string | null;
  code: string;
  description: string | null;
  bookCount: number;
  children: CategoryTreeNode[];
}

export interface CreateCategoryInput {
  name: string;
  nameLocal?: string;
  code: string;
  parentId?: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  nameLocal?: string;
  code?: string;
  parentId?: string | null;
  description?: string;
}

// ===========================================
// Library Location Types
// ===========================================

export interface LibraryLocation {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  section: string | null;
  capacity: number | null;
  isActive: boolean;
  bookCount: number;
  createdAt: string;
  updatedAt: string;
}

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

// ===========================================
// Book Types
// ===========================================

export type BookStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  titleLocal: string | null;
  author: string;
  coAuthors: string[];
  publisher: string | null;
  publishYear: number | null;
  edition: string | null;
  language: string;
  pages: number | null;
  categoryId: string;
  locationId: string | null;
  shelfNumber: string | null;
  totalCopies: number;
  availableCopies: number;
  coverImage: string | null;
  description: string | null;
  tags: string[];
  status: BookStatus;
  category: { id: string; name: string; code: string };
  location: { id: string; name: string; section?: string | null } | null;
  copyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookDetail extends Omit<Book, 'category' | 'location'> {
  category: {
    id: string;
    name: string;
    nameLocal: string | null;
    code: string;
  };
  location: {
    id: string;
    name: string;
    building: string | null;
    floor: string | null;
    section: string | null;
  } | null;
  copies: BookCopy[];
}

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
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: BookStatus;
  language?: string;
}

// ===========================================
// Book Copy Types
// ===========================================

export type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE' | 'LOST' | 'RETIRED';

export interface BookCopy {
  id: string;
  bookId: string;
  copyNumber: string;
  barcode: string;
  condition: CopyCondition;
  status: CopyStatus;
  acquisitionDate: string;
  acquisitionType: string;
  notes: string | null;
  currentBorrower?: {
    id: string;
    studentId: string;
    user: { firstName: string; lastName: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

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

// ===========================================
// Other Types
// ===========================================

export interface PaginatedBooks {
  data: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryReport {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  byStatus: Record<string, number>;
  byCategory: { id: string; name: string; bookCount: number }[];
}

interface PaginatedApiResponse {
  success: boolean;
  data: Book[];
  pagination: PaginatedBooks['pagination'];
  message?: string;
}

// ===========================================
// API Functions
// ===========================================

export const libraryApi = {
  // Categories
  getCategories: async (): Promise<ApiResponse<BookCategory[]>> => {
    const response = await api.get<ApiResponse<BookCategory[]>>('/api/v1/library/categories');
    return response.data;
  },

  getCategoryTree: async (): Promise<ApiResponse<CategoryTreeNode[]>> => {
    const response = await api.get<ApiResponse<CategoryTreeNode[]>>('/api/v1/library/categories/tree');
    return response.data;
  },

  getCategoryById: async (id: string): Promise<ApiResponse<BookCategory>> => {
    const response = await api.get<ApiResponse<BookCategory>>(`/api/v1/library/categories/${id}`);
    return response.data;
  },

  createCategory: async (data: CreateCategoryInput): Promise<ApiResponse<BookCategory>> => {
    const response = await api.post<ApiResponse<BookCategory>>('/api/v1/library/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: UpdateCategoryInput): Promise<ApiResponse<BookCategory>> => {
    const response = await api.patch<ApiResponse<BookCategory>>(`/api/v1/library/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/library/categories/${id}`);
    return response.data;
  },

  // Locations
  getLocations: async (includeInactive = false): Promise<ApiResponse<LibraryLocation[]>> => {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', 'true');
    const response = await api.get<ApiResponse<LibraryLocation[]>>(
      `/api/v1/library/locations?${params.toString()}`
    );
    return response.data;
  },

  getLocationById: async (id: string): Promise<ApiResponse<LibraryLocation>> => {
    const response = await api.get<ApiResponse<LibraryLocation>>(`/api/v1/library/locations/${id}`);
    return response.data;
  },

  createLocation: async (data: CreateLocationInput): Promise<ApiResponse<LibraryLocation>> => {
    const response = await api.post<ApiResponse<LibraryLocation>>('/api/v1/library/locations', data);
    return response.data;
  },

  updateLocation: async (id: string, data: UpdateLocationInput): Promise<ApiResponse<LibraryLocation>> => {
    const response = await api.patch<ApiResponse<LibraryLocation>>(`/api/v1/library/locations/${id}`, data);
    return response.data;
  },

  deleteLocation: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/library/locations/${id}`);
    return response.data;
  },

  // Books
  getBooks: async (filters: BookFilters = {}): Promise<ApiResponse<PaginatedBooks>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.locationId) params.append('locationId', filters.locationId);
    if (filters.status) params.append('status', filters.status);
    if (filters.language) params.append('language', filters.language);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/library/books?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getBookById: async (id: string): Promise<ApiResponse<BookDetail>> => {
    const response = await api.get<ApiResponse<BookDetail>>(`/api/v1/library/books/${id}`);
    return response.data;
  },

  getBookByISBN: async (isbn: string): Promise<ApiResponse<Book>> => {
    const response = await api.get<ApiResponse<Book>>(`/api/v1/library/books/isbn/${isbn}`);
    return response.data;
  },

  searchBooks: async (query: string, categoryId?: string, limit = 50): Promise<ApiResponse<Book[]>> => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (categoryId) params.append('categoryId', categoryId);
    params.append('limit', String(limit));
    const response = await api.get<ApiResponse<Book[]>>(`/api/v1/library/books/search?${params.toString()}`);
    return response.data;
  },

  getNewArrivals: async (limit = 10): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>(`/api/v1/library/books/new-arrivals?limit=${limit}`);
    return response.data;
  },

  getPopularBooks: async (limit = 10): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>(`/api/v1/library/books/popular?limit=${limit}`);
    return response.data;
  },

  getLowStockBooks: async (): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>('/api/v1/library/books/low-stock');
    return response.data;
  },

  getInventoryReport: async (): Promise<ApiResponse<InventoryReport>> => {
    const response = await api.get<ApiResponse<InventoryReport>>('/api/v1/library/books/inventory');
    return response.data;
  },

  createBook: async (data: CreateBookInput): Promise<ApiResponse<Book>> => {
    const response = await api.post<ApiResponse<Book>>('/api/v1/library/books', data);
    return response.data;
  },

  updateBook: async (id: string, data: UpdateBookInput): Promise<ApiResponse<Book>> => {
    const response = await api.patch<ApiResponse<Book>>(`/api/v1/library/books/${id}`, data);
    return response.data;
  },

  deleteBook: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/library/books/${id}`);
    return response.data;
  },

  addCopies: async (
    bookId: string,
    quantity: number,
    condition?: CopyCondition,
    acquisitionType?: 'PURCHASE' | 'DONATION' | 'TRANSFER',
    notes?: string
  ): Promise<ApiResponse<BookCopy[]>> => {
    const response = await api.post<ApiResponse<BookCopy[]>>(`/api/v1/library/books/${bookId}/add-copies`, {
      quantity,
      condition,
      acquisitionType,
      notes,
    });
    return response.data;
  },

  removeCopies: async (bookId: string, quantity: number, reason: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(`/api/v1/library/books/${bookId}/remove-copies`, {
      quantity,
      reason,
    });
    return response.data;
  },

  // Book Copies
  getBookCopies: async (bookId: string): Promise<ApiResponse<BookCopy[]>> => {
    const response = await api.get<ApiResponse<BookCopy[]>>(`/api/v1/library/books/${bookId}/copies`);
    return response.data;
  },

  getCopyByBarcode: async (barcode: string): Promise<ApiResponse<BookCopy>> => {
    const response = await api.get<ApiResponse<BookCopy>>(`/api/v1/library/copies/barcode/${barcode}`);
    return response.data;
  },

  getCopyById: async (id: string): Promise<ApiResponse<BookCopy>> => {
    const response = await api.get<ApiResponse<BookCopy>>(`/api/v1/library/copies/${id}`);
    return response.data;
  },

  updateCopy: async (id: string, data: UpdateCopyInput): Promise<ApiResponse<BookCopy>> => {
    const response = await api.patch<ApiResponse<BookCopy>>(`/api/v1/library/copies/${id}`, data);
    return response.data;
  },

  markCopyAsLost: async (id: string, borrowingId?: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(`/api/v1/library/copies/${id}/mark-lost`, {
      borrowingId,
    });
    return response.data;
  },
};

export default libraryApi;
