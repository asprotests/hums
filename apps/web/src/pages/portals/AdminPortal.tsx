import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Shield, LayoutDashboard, Activity, GraduationCap, UserPlus, School, DollarSign, Settings, Building2, BookOpen, ClipboardList, CalendarCheck, Clock, Calendar, Briefcase, CreditCard, Mail, MessageSquare } from 'lucide-react';
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
import { RoomListPage, RoomFormPage } from '@/pages/admin/rooms';
import { ClassListPage, ClassFormPage, ClassDetailPage } from '@/pages/admin/classes';
import {
  RegistrationPeriodListPage,
  RegistrationPeriodFormPage,
  HoldListPage,
  EnrollmentListPage,
} from '@/pages/admin/registration';
import {
  AttendanceDashboardPage,
  MarkAttendancePage,
  ClassAttendanceReportPage,
} from '@/pages/admin/attendance';
import {
  DailyAttendancePage,
  EmployeeAttendanceReportPage,
  LeaveTypesPage,
  LeaveRequestsPage,
  LeaveBalancesPage,
  LeaveCalendarPage,
  SalaryComponentsPage,
  PayrollProcessPage,
  PayrollListPage,
  PayslipPage,
} from '@/pages/admin/hr';
import {
  ClassGradesPage,
  GradeComponentFormPage,
  GradeEntryPage,
  ExamListPage,
  ExamFormPage,
} from '@/pages/admin/grades';
import { EmailTemplatesPage } from '@/pages/admin/EmailTemplatesPage';
import { EmailTemplateEditorPage } from '@/pages/admin/EmailTemplateEditorPage';
import { SMSDashboardPage } from '@/pages/admin/SMSDashboardPage';
import { BulkSMSPage } from '@/pages/admin/BulkSMSPage';

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
        <Link to="/admin/rooms">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Rooms
              </CardTitle>
              <CardDescription>Manage classrooms and facilities</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/classes">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Classes
              </CardTitle>
              <CardDescription>Manage class sections and schedules</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/exams">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exams
              </CardTitle>
              <CardDescription>Schedule and manage exams</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/registration">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Registration
              </CardTitle>
              <CardDescription>Manage registration periods, holds, and enrollments</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/attendance">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Student Attendance
              </CardTitle>
              <CardDescription>Mark and track student class attendance</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/hr">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                HR Attendance
              </CardTitle>
              <CardDescription>Employee check-in, check-out, and reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/hr/leave">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Leave Management
              </CardTitle>
              <CardDescription>Leave types, requests, and approvals</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/hr/payroll">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payroll
              </CardTitle>
              <CardDescription>Process payroll and manage salary components</CardDescription>
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
        <Link to="/admin/email/templates">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>Manage email templates and notifications</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/sms">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Dashboard
              </CardTitle>
              <CardDescription>Send SMS and view delivery statistics</CardDescription>
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
  { path: '/admin/rooms', label: 'Rooms', icon: Building2 },
  { path: '/admin/classes', label: 'Classes', icon: BookOpen },
  { path: '/admin/exams', label: 'Exams', icon: Calendar },
  { path: '/admin/registration', label: 'Registration', icon: ClipboardList },
  { path: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { path: '/admin/admissions', label: 'Admissions', icon: UserPlus },
  { path: '/admin/students', label: 'Students', icon: School },
  { path: '/admin/hr', label: 'HR', icon: Clock },
  { path: '/admin/finance', label: 'Finance', icon: DollarSign },
  { path: '/admin/audit', label: 'Audit', icon: Activity },
  { path: '/admin/email', label: 'Email', icon: Mail },
  { path: '/admin/sms', label: 'SMS', icon: MessageSquare },
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
        {/* Room Routes */}
        <Route path="rooms" element={<RoomListPage />} />
        <Route path="rooms/new" element={<RoomFormPage />} />
        <Route path="rooms/:id/edit" element={<RoomFormPage />} />
        {/* Class Routes */}
        <Route path="classes" element={<ClassListPage />} />
        <Route path="classes/new" element={<ClassFormPage />} />
        <Route path="classes/:id" element={<ClassDetailPage />} />
        <Route path="classes/:id/edit" element={<ClassFormPage />} />
        {/* Grading Routes */}
        <Route path="classes/:classId/grades" element={<ClassGradesPage />} />
        <Route path="classes/:classId/components/new" element={<GradeComponentFormPage />} />
        <Route path="grade-components/:componentId/edit" element={<GradeComponentFormPage />} />
        <Route path="grade-components/:componentId/grades" element={<GradeEntryPage />} />
        {/* Exam Routes */}
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/new" element={<ExamFormPage />} />
        <Route path="exams/:examId/edit" element={<ExamFormPage />} />
        {/* Registration Routes */}
        <Route path="registration" element={<EnrollmentListPage />} />
        <Route path="registration/enrollments" element={<EnrollmentListPage />} />
        <Route path="registration/periods" element={<RegistrationPeriodListPage />} />
        <Route path="registration/periods/new" element={<RegistrationPeriodFormPage />} />
        <Route path="registration/periods/:id/edit" element={<RegistrationPeriodFormPage />} />
        <Route path="registration/holds" element={<HoldListPage />} />
        {/* Attendance Routes */}
        <Route path="attendance" element={<AttendanceDashboardPage />} />
        <Route path="attendance/class/:classId" element={<ClassAttendanceReportPage />} />
        <Route path="attendance/class/:classId/mark" element={<MarkAttendancePage />} />
        {/* HR Routes */}
        <Route path="hr" element={<DailyAttendancePage />} />
        <Route path="hr/daily" element={<DailyAttendancePage />} />
        <Route path="hr/report" element={<EmployeeAttendanceReportPage />} />
        {/* HR Leave Management Routes */}
        <Route path="hr/leave" element={<LeaveRequestsPage />} />
        <Route path="hr/leave/requests" element={<LeaveRequestsPage />} />
        <Route path="hr/leave/types" element={<LeaveTypesPage />} />
        <Route path="hr/leave/balances" element={<LeaveBalancesPage />} />
        <Route path="hr/leave/calendar" element={<LeaveCalendarPage />} />
        {/* HR Payroll Routes */}
        <Route path="hr/payroll" element={<PayrollListPage />} />
        <Route path="hr/payroll/process" element={<PayrollProcessPage />} />
        <Route path="hr/payroll/:id" element={<PayslipPage />} />
        <Route path="hr/salary-components" element={<SalaryComponentsPage />} />
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
        {/* Email Routes */}
        <Route path="email/templates" element={<EmailTemplatesPage />} />
        <Route path="email/templates/:id/edit" element={<EmailTemplateEditorPage />} />
        {/* SMS Routes */}
        <Route path="sms" element={<SMSDashboardPage />} />
        <Route path="sms/bulk" element={<BulkSMSPage />} />
        <Route path="sms/send" element={<BulkSMSPage />} />
        {/* Settings Routes */}
        <Route path="settings" element={<SystemSettingsPage />} />
      </Routes>
    </div>
  );
}
