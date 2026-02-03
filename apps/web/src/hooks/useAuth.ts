import { useAuthContext } from '../contexts/AuthContext';

/**
 * Custom hook for authentication
 * Provides access to auth state and methods
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
  } = useAuthContext();

  return {
    // User state
    user,
    isAuthenticated,
    isLoading,

    // Auth methods
    login,
    logout,

    // Permission checks
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,

    // Convenience getters
    userId: user?.id,
    userEmail: user?.email,
    userName: user ? `${user.firstName} ${user.lastName}` : null,
    userRoles: user?.roles || [],
    userPermissions: user?.permissions || [],

    // Role checks
    isSuperAdmin: user?.roles.some((r) => r.name === 'SUPER_ADMIN') || false,
    isAdmin: user?.roles.some((r) => r.name === 'ADMIN' || r.name === 'SUPER_ADMIN') || false,
    isStudent: user?.roles.some((r) => r.name === 'STUDENT') || false,
    isLecturer: user?.roles.some((r) => r.name === 'LECTURER') || false,
    isStaff:
      user?.roles.some((r) =>
        ['HR_STAFF', 'FINANCE_STAFF', 'LIBRARIAN', 'LECTURER', 'DEAN', 'HOD'].includes(r.name)
      ) || false,
  };
}

export default useAuth;
