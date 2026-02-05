import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Shield, LayoutDashboard, Activity, GraduationCap, UserPlus, School, DollarSign, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserListPage, UserFormPage, UserDetailPage } from '@/pages/admin/users';
import { RoleListPage, RoleFormPage } from '@/pages/admin/roles';
import {
  AcademicDashboard,
  FacultyListPage,
  FacultyFormPage,
  FacultyDetailPage,
  DepartmentListPage,
  DepartmentFormPage,
  DepartmentDetailPage,
  ProgramListPage,
  ProgramFormPage,
  ProgramDetailPage,
  CourseListPage,
  CourseFormPage,
  AcademicCalendarPage,
} from '@/pages/admin/academic';
import {
  AdmissionListPage,
  AdmissionFormPage,
  AdmissionDetailPage,
} from '@/pages/admin/admissions';
import {
  StudentListPage,
  StudentDetailPage,
  StudentEditPage,
} from '@/pages/admin/students';
import {
  FinanceDashboardPage,
  FeeStructureListPage,
  FeeStructureFormPage,
  InvoiceListPage,
  InvoiceDetailPage,
  PaymentListPage,
  PaymentFormPage,
  PaymentReceiptPage,
  CollectionReportPage,
  OutstandingReportPage,
} from '@/pages/admin/finance';
import { SystemSettingsPage } from '@/pages/admin/settings';
import { AuditLogPage } from '@/pages/admin/audit';

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="text-muted-foreground">System configuration and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Active system users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All services running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Today's entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage users, assign roles, and control access</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/roles">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>Configure roles and permissions</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/academic">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Structure
              </CardTitle>
              <CardDescription>Manage faculties, departments, programs, and courses</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/admissions">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Admissions
              </CardTitle>
              <CardDescription>Manage admission applications and enrollment</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/students">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Students
              </CardTitle>
              <CardDescription>View and manage enrolled students</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/finance">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Finance
              </CardTitle>
              <CardDescription>Fee structures, invoices, and payments</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/audit">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>View system activity and audit trails</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/settings">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system settings and branding</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/academic', label: 'Academic', icon: GraduationCap },
  { path: '/admin/admissions', label: 'Admissions', icon: UserPlus },
  { path: '/admin/students', label: 'Students', icon: School },
  { path: '/admin/finance', label: 'Finance', icon: DollarSign },
  { path: '/admin/audit', label: 'Audit', icon: Activity },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

function AdminNav() {
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

export function AdminPortal() {
  return (
    <div>
      <AdminNav />
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/new" element={<UserFormPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="users/:id/edit" element={<UserFormPage />} />
        <Route path="roles" element={<RoleListPage />} />
        <Route path="roles/new" element={<RoleFormPage />} />
        <Route path="roles/:id/edit" element={<RoleFormPage />} />
        {/* Academic Structure Routes */}
        <Route path="academic" element={<AcademicDashboard />} />
        <Route path="academic/faculties" element={<FacultyListPage />} />
        <Route path="academic/faculties/new" element={<FacultyFormPage />} />
        <Route path="academic/faculties/:id" element={<FacultyDetailPage />} />
        <Route path="academic/faculties/:id/edit" element={<FacultyFormPage />} />
        <Route path="academic/departments" element={<DepartmentListPage />} />
        <Route path="academic/departments/new" element={<DepartmentFormPage />} />
        <Route path="academic/departments/:id" element={<DepartmentDetailPage />} />
        <Route path="academic/departments/:id/edit" element={<DepartmentFormPage />} />
        <Route path="academic/programs" element={<ProgramListPage />} />
        <Route path="academic/programs/new" element={<ProgramFormPage />} />
        <Route path="academic/programs/:id" element={<ProgramDetailPage />} />
        <Route path="academic/programs/:id/edit" element={<ProgramFormPage />} />
        <Route path="academic/courses" element={<CourseListPage />} />
        <Route path="academic/courses/new" element={<CourseFormPage />} />
        <Route path="academic/courses/:id/edit" element={<CourseFormPage />} />
        <Route path="academic/calendar" element={<AcademicCalendarPage />} />
        {/* Admission Routes */}
        <Route path="admissions" element={<AdmissionListPage />} />
        <Route path="admissions/new" element={<AdmissionFormPage />} />
        <Route path="admissions/:id" element={<AdmissionDetailPage />} />
        <Route path="admissions/:id/edit" element={<AdmissionFormPage />} />
        {/* Student Routes */}
        <Route path="students" element={<StudentListPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="students/:id/edit" element={<StudentEditPage />} />
        {/* Finance Routes */}
        <Route path="finance" element={<FinanceDashboardPage />} />
        <Route path="finance/fee-structures" element={<FeeStructureListPage />} />
        <Route path="finance/fee-structures/new" element={<FeeStructureFormPage />} />
        <Route path="finance/fee-structures/:id/edit" element={<FeeStructureFormPage />} />
        <Route path="finance/invoices" element={<InvoiceListPage />} />
        <Route path="finance/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="finance/payments" element={<PaymentListPage />} />
        <Route path="finance/payments/new" element={<PaymentFormPage />} />
        <Route path="finance/payments/:id/receipt" element={<PaymentReceiptPage />} />
        <Route path="finance/reports" element={<CollectionReportPage />} />
        <Route path="finance/reports/collection" element={<CollectionReportPage />} />
        <Route path="finance/reports/outstanding" element={<OutstandingReportPage />} />
        {/* Audit Routes */}
        <Route path="audit" element={<AuditLogPage />} />
        {/* Settings Routes */}
        <Route path="settings" element={<SystemSettingsPage />} />
      </Routes>
    </div>
  );
}
