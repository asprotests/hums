import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  FileText,
  ClipboardCheck,
  BarChart3,
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/academic/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'My Classes',
    href: '/academic/classes',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: 'Schedule',
    href: '/academic/schedule',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    label: 'Attendance',
    href: '/academic/attendance',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    label: 'Grades',
    href: '/academic/grades',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: 'Materials',
    href: '/academic/materials',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: 'Exams',
    href: '/academic/exams',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
];

const hodNavItems: NavItem[] = [
  {
    label: 'Department',
    href: '/academic/hod',
    icon: <Users className="h-5 w-5" />,
    roles: ['HOD', 'ADMIN'],
  },
  {
    label: 'Reports',
    href: '/academic/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['HOD', 'DEAN', 'ADMIN'],
  },
];

export function AcademicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('current');

  // Get user role names as strings
  const userRoleNames = user?.roles?.map((r) => r.name) || [];

  // Filter nav items based on user roles
  const allNavItems = [...navItems, ...hodNavItems.filter(
    (item) => !item.roles || item.roles.some((r) => userRoleNames.includes(r))
  )];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLinks = ({ mobile = false }) => (
    <nav className={cn('space-y-1', mobile ? 'px-2' : 'px-3')}>
      {allNavItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={() => mobile && setSidebarOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-card md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="ml-2 text-lg font-bold">Academic Portal</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <NavLinks />
          </div>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {userRoleNames[0] || 'Lecturer'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Mobile Menu Dialog */}
          <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <DialogContent className="h-full max-h-screen w-64 p-0 sm:max-w-64 fixed left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r">
              <DialogTitle className="sr-only">Navigation Menu</DialogTitle>
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center justify-between border-b px-6">
                  <div className="flex items-center">
                    <GraduationCap className="h-8 w-8 text-primary" />
                    <span className="ml-2 text-lg font-bold">Academic</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                  <NavLinks mobile />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Title (hidden on mobile) */}
          <div className="hidden md:block" />

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Semester Selector */}
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Fall 2025</SelectItem>
                <SelectItem value="spring-2026">Spring 2026</SelectItem>
              </SelectContent>
            </Select>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                3
              </span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  {user?.firstName} {user?.lastName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/academic/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AcademicLayout;
