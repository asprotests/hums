import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  MapPin,
  BookCheck,
  BookMinus,
  Clock,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LibraryDashboardPage,
  BookCatalogPage,
  BookDetailPage,
  BookFormPage,
  CategoriesPage,
  LocationsPage,
  IssueBookPage,
  ReturnBookPage,
  BorrowingsListPage,
  OverdueBooksPage,
  ReservationsPage,
} from '@/pages/library';

const navItems = [
  { path: '/library', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/library/books', label: 'Catalog', icon: BookOpen },
  { path: '/library/borrowings', label: 'Borrowings', icon: Clock },
  { path: '/library/issue', label: 'Issue', icon: BookCheck },
  { path: '/library/return', label: 'Return', icon: BookMinus },
  { path: '/library/overdue', label: 'Overdue', icon: AlertTriangle },
  { path: '/library/reservations', label: 'Reservations', icon: CalendarClock },
  { path: '/library/categories', label: 'Categories', icon: FolderTree },
  { path: '/library/locations', label: 'Locations', icon: MapPin },
];

function LibraryNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-1 mb-6 border-b pb-4">
      {navItems.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);

        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={cn('gap-2', isActive && 'pointer-events-none')}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function LibraryPortal() {
  return (
    <div>
      <LibraryNav />
      <Routes>
        <Route index element={<LibraryDashboardPage />} />
        <Route path="books" element={<BookCatalogPage />} />
        <Route path="books/new" element={<BookFormPage />} />
        <Route path="books/:id" element={<BookDetailPage />} />
        <Route path="books/:id/edit" element={<BookFormPage />} />
        <Route path="borrowings" element={<BorrowingsListPage />} />
        <Route path="issue" element={<IssueBookPage />} />
        <Route path="return" element={<ReturnBookPage />} />
        <Route path="overdue" element={<OverdueBooksPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="locations" element={<LocationsPage />} />
      </Routes>
    </div>
  );
}
