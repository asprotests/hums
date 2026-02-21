import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Calendar,
  GraduationCap,
  ClipboardCheck,
  DollarSign,
  Bell,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  StudentDashboardPage,
  StudentProfilePage,
  StudentSchedulePage,
  StudentGradesPage,
  StudentAttendancePage,
  StudentFinancePage,
  StudentAnnouncementsPage,
  StudentTranscriptPage,
} from '@/pages/student';
import { OnlinePaymentPage } from '@/pages/student/OnlinePaymentPage';

const navItems = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/student/profile', label: 'Profile', icon: User },
  { path: '/student/schedule', label: 'Schedule', icon: Calendar },
  { path: '/student/grades', label: 'Grades', icon: GraduationCap },
  { path: '/student/attendance', label: 'Attendance', icon: ClipboardCheck },
  { path: '/student/finance', label: 'Finance', icon: DollarSign },
  { path: '/student/announcements', label: 'Announcements', icon: Bell },
];

function StudentNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-1 mb-6 border-b pb-4 overflow-x-auto">
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
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          </Link>
        );
      })}
      {/* Transcript link in nav */}
      <Link to="/student/transcript">
        <Button
          variant={location.pathname === '/student/transcript' ? 'default' : 'ghost'}
          size="sm"
          className={cn('gap-2', location.pathname === '/student/transcript' && 'pointer-events-none')}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Transcript</span>
        </Button>
      </Link>
    </nav>
  );
}

export function StudentPortal() {
  return (
    <div>
      <StudentNav />
      <Routes>
        <Route index element={<StudentDashboardPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="grades" element={<StudentGradesPage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="finance" element={<StudentFinancePage />} />
        <Route path="finance/pay" element={<OnlinePaymentPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="transcript" element={<StudentTranscriptPage />} />
      </Routes>
    </div>
  );
}
