import { Routes, Route, Navigate } from 'react-router-dom';
import { AcademicLayout } from '@/layouts/AcademicLayout';
import {
  LecturerDashboardPage,
  ClassesListPage,
  ClassDetailPage,
  MaterialsPage,
  HODDashboardPage,
  DeanDashboardPage,
} from '@/pages/academic';
import { useAuth } from '@/hooks/useAuth';

// Placeholder pages for features to be implemented
function SchedulePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Schedule</h1>
      <p className="text-muted-foreground">Weekly schedule view coming soon.</p>
    </div>
  );
}

function AttendancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <p className="text-muted-foreground">Attendance overview coming soon.</p>
    </div>
  );
}

function GradesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Grades</h1>
      <p className="text-muted-foreground">Grades overview coming soon.</p>
    </div>
  );
}

function AllMaterialsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Course Materials</h1>
      <p className="text-muted-foreground">Materials across all classes coming soon.</p>
    </div>
  );
}

function ExamsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exams</h1>
      <p className="text-muted-foreground">Exam management coming soon.</p>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-muted-foreground">Academic reports coming soon.</p>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-muted-foreground">Profile settings coming soon.</p>
    </div>
  );
}

function ClassAttendancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Class Attendance</h1>
      <p className="text-muted-foreground">Attendance marking coming soon.</p>
    </div>
  );
}

function ClassGradesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Class Grades</h1>
      <p className="text-muted-foreground">Grade entry coming soon.</p>
    </div>
  );
}

export function AcademicPortal() {
  const { hasRole, hasAnyRole } = useAuth();
  const isHOD = hasRole('HOD');
  const isDean = hasRole('DEAN');
  const isAdmin = hasAnyRole(['ADMIN', 'SUPER_ADMIN']);

  return (
    <Routes>
      <Route element={<AcademicLayout />}>
        {/* Dashboard - route based on role */}
        <Route
          path="dashboard"
          element={
            isDean ? (
              <DeanDashboardPage />
            ) : isHOD ? (
              <HODDashboardPage />
            ) : (
              <LecturerDashboardPage />
            )
          }
        />

        {/* Classes */}
        <Route path="classes" element={<ClassesListPage />} />
        <Route path="classes/:classId" element={<ClassDetailPage />} />
        <Route path="classes/:classId/attendance" element={<ClassAttendancePage />} />
        <Route path="classes/:classId/grades" element={<ClassGradesPage />} />
        <Route path="classes/:classId/materials" element={<MaterialsPage />} />

        {/* Schedule */}
        <Route path="schedule" element={<SchedulePage />} />

        {/* Attendance */}
        <Route path="attendance" element={<AttendancePage />} />

        {/* Grades */}
        <Route path="grades" element={<GradesPage />} />

        {/* Materials */}
        <Route path="materials" element={<AllMaterialsPage />} />

        {/* Exams */}
        <Route path="exams" element={<ExamsPage />} />

        {/* HOD specific routes */}
        {(isHOD || isAdmin) && <Route path="hod" element={<HODDashboardPage />} />}

        {/* Dean specific routes */}
        {(isDean || isAdmin) && <Route path="dean" element={<DeanDashboardPage />} />}

        {/* Reports */}
        <Route path="reports" element={<ReportsPage />} />

        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Default redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default AcademicPortal;
