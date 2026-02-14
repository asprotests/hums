import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BookCopy,
  FolderTree,
  MapPin,
  Search,
  Plus,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { libraryApi, type Book, type InventoryReport } from '@/lib/api/library';

export function LibraryDashboardPage() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [lowStock, setLowStock] = useState<Book[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [reportRes, lowStockRes, newArrivalsRes, popularRes] = await Promise.all([
        libraryApi.getInventoryReport(),
        libraryApi.getLowStockBooks(),
        libraryApi.getNewArrivals(5),
        libraryApi.getPopularBooks(5),
      ]);

      if (reportRes.success && reportRes.data) setReport(reportRes.data);
      if (lowStockRes.success && lowStockRes.data) setLowStock(lowStockRes.data);
      if (newArrivalsRes.success && newArrivalsRes.data) setNewArrivals(newArrivalsRes.data);
      if (popularRes.success && popularRes.data) setPopularBooks(popularRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Library Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of library resources and activities
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/library/books">
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Search Catalog
            </Button>
          </Link>
          <Link to="/library/books/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.totalBooks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unique titles in catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Copies</CardTitle>
            <BookCopy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.totalCopies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Physical copies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {report?.availableCopies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to borrow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrowed</CardTitle>
            <BookCopy className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {report?.borrowedCopies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently checked out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/library/books">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5" />
                Book Catalog
              </CardTitle>
              <CardDescription>
                Browse and search all books
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/library/categories">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderTree className="h-5 w-5" />
                Categories
              </CardTitle>
              <CardDescription>
                Manage book categories
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/library/locations">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
              <CardDescription>
                Library locations and shelves
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/library/books/new">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-5 w-5" />
                Add Book
              </CardTitle>
              <CardDescription>
                Add new book to catalog
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                Books with limited availability
              </CardDescription>
            </div>
            <Link to="/library/books?status=LOW_STOCK">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No low stock alerts
              </p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/library/books/${book.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {book.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {book.author}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        book.availableCopies === 0
                          ? 'text-red-600 border-red-200'
                          : 'text-yellow-600 border-yellow-200'
                      }
                    >
                      {book.availableCopies} / {book.totalCopies}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Books by Category
            </CardTitle>
            <CardDescription>
              Distribution across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report?.byCategory && report.byCategory.length > 0 ? (
              <div className="space-y-3">
                {report.byCategory.slice(0, 6).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <Badge variant="secondary">{cat.bookCount} books</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories found
              </p>
            )}
          </CardContent>
        </Card>

        {/* New Arrivals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                New Arrivals
              </CardTitle>
              <CardDescription>
                Recently added books
              </CardDescription>
            </div>
            <Link to="/library/books">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {newArrivals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No new arrivals
              </p>
            ) : (
              <div className="space-y-3">
                {newArrivals.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/library/books/${book.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {book.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {book.author}
                      </p>
                    </div>
                    <Badge variant="outline">{book.category.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Books */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Books
              </CardTitle>
              <CardDescription>
                Most borrowed titles
              </CardDescription>
            </div>
            <Link to="/library/books">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {popularBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No borrowing history yet
              </p>
            ) : (
              <div className="space-y-3">
                {popularBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/library/books/${book.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {book.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {book.author}
                      </p>
                    </div>
                    <Badge variant="secondary">{book.category.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LibraryDashboardPage;
