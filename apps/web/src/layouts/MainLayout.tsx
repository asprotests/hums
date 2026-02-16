import { Outlet, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/NotificationBell';

const navItems = [
  { path: '/admin', label: 'Admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { path: '/academic', label: 'Academic', roles: ['SUPER_ADMIN', 'ADMIN', 'DEAN', 'HOD', 'LECTURER'] },
  { path: '/student', label: 'Student', roles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'] },
  { path: '/staff', label: 'Staff', roles: ['SUPER_ADMIN', 'ADMIN', 'HR_STAFF', 'DEAN', 'HOD', 'LECTURER'] },
  { path: '/finance', label: 'Finance', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_STAFF'] },
  { path: '/library', label: 'Library', roles: ['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'STUDENT'] },
];

export function MainLayout() {
  const { logout, userName, hasAnyRole } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Filter nav items based on user roles
  const visibleNavItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            HUMS
          </Link>
          <nav className="flex items-center gap-6">
            {visibleNavItems.map((item) => (
              <Link key={item.path} to={item.path} className="text-sm hover:text-primary">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-muted-foreground">{userName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
