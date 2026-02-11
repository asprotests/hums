import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, User, Clock, Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MyLeavePage, MyPayslipsPage } from '@/pages/employee';

function StaffDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Staff Portal</h1>
        <p className="text-muted-foreground">Employee self-service portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Days available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Attendance days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Payslip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Net salary</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/staff/leave">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                My Leave
              </CardTitle>
              <CardDescription>View balances and submit leave requests</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/staff/payslips">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                My Payslips
              </CardTitle>
              <CardDescription>View and download your payslips</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/staff/attendance">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                My Attendance
              </CardTitle>
              <CardDescription>View your attendance records</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/staff/profile">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                My Profile
              </CardTitle>
              <CardDescription>View and update your profile</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="text-center py-16">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">This feature is coming soon.</p>
    </div>
  );
}

const navItems = [
  { path: '/staff', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/staff/leave', label: 'My Leave', icon: Briefcase },
  { path: '/staff/payslips', label: 'My Payslips', icon: DollarSign },
  { path: '/staff/attendance', label: 'Attendance', icon: Clock },
  { path: '/staff/profile', label: 'Profile', icon: User },
];

function StaffNav() {
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

export function StaffPortal() {
  return (
    <div>
      <StaffNav />
      <Routes>
        <Route index element={<StaffDashboard />} />
        <Route path="leave" element={<MyLeavePage />} />
        <Route path="payslips" element={<MyPayslipsPage />} />
        <Route path="attendance" element={<ComingSoon title="My Attendance" />} />
        <Route path="profile" element={<ComingSoon title="My Profile" />} />
      </Routes>
    </div>
  );
}
