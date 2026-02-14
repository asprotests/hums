import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { libraryApi, type Book, type BookCategory, type LibraryLocation } from '@/lib/api/library';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  LOW_STOCK: 'bg-yellow-100 text-yellow-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
  DISCONTINUED: 'bg-gray-100 text-gray-800',
};

export function BookCatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [locations, setLocations] = useState<LibraryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters from URL
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const locationId = searchParams.get('locationId') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [search, categoryId, locationId, status, page]);

  const loadFilters = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        libraryApi.getCategories(),
        libraryApi.getLocations(),
      ]);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (locRes.success && locRes.data) setLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await libraryApi.getBooks({
        page,
        limit: 20,
        search: search || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        status: (status as any) || undefined,
      });
      if (response.success && response.data) {
        setBooks(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchInput);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Book Catalog</h1>
          <p className="text-muted-foreground">
            Browse and manage the library book collection
          </p>
        </div>
        <Button onClick={() => navigate('/library/books/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Book
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, ISBN..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <Select
              value={categoryId}
              onValueChange={(v) => updateFilters('categoryId', v === 'ALL' ? '' : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={locationId}
              onValueChange={(v) => updateFilters('locationId', v === 'ALL' ? '' : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => updateFilters('status', v === 'ALL' ? '' : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Book List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No books found</p>
            {search && (
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <Card
              key={book.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/library/books/${book.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Book Cover */}
                  <div className="w-16 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                        {book.coAuthors && book.coAuthors.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            with {book.coAuthors.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {book.status !== 'AVAILABLE' && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <Badge className={STATUS_COLORS[book.status]}>
                          {book.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {book.isbn && <span>ISBN: {book.isbn}</span>}
                      <span>|</span>
                      <span>{book.category.name}</span>
                      {book.location && (
                        <>
                          <span>|</span>
                          <span>
                            {book.location.name}
                            {book.shelfNumber && `, Shelf ${book.shelfNumber}`}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm">
                        <span
                          className={
                            book.availableCopies === 0
                              ? 'text-red-500'
                              : book.availableCopies < 2
                                ? 'text-yellow-500'
                                : 'text-green-500'
                          }
                        >
                          {book.availableCopies} available
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          / {book.totalCopies} total
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/library/books/${book.id}`);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/library/books/${book.id}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} books
          </p>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default BookCatalogPage;
