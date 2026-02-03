import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import {
  Home,
  AdminPortal,
  AcademicPortal,
  StudentPortal,
  StaffPortal,
  FinancePortal,
  LibraryPortal,
} from './pages';
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route
              path="admin/*"
              element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="academic/*"
              element={
                <ProtectedRoute
                  requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DEAN', 'HOD', 'LECTURER']}
                >
                  <AcademicPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="student/*"
              element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'STUDENT']}>
                  <StudentPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="staff/*"
              element={
                <ProtectedRoute
                  requiredRoles={['SUPER_ADMIN', 'ADMIN', 'HR_STAFF', 'DEAN', 'HOD', 'LECTURER']}
                >
                  <StaffPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="finance/*"
              element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'FINANCE_STAFF']}>
                  <FinancePortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="library/*"
              element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'STUDENT']}>
                  <LibraryPortal />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
