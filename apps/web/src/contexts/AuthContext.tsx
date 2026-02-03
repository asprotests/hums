import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, tokenStorage, type AuthUser } from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenStorage.getAccessToken();

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          tokenStorage.clearTokens();
        }
      } catch {
        tokenStorage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Setup token refresh timer
  useEffect(() => {
    if (!user) return;

    // Refresh token 1 minute before expiry (assuming 15 min token life)
    const refreshInterval = setInterval(
      async () => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          try {
            const response = await authApi.refreshToken(refreshToken);
            if (response.success && response.data) {
              tokenStorage.setAccessToken(response.data.accessToken);
            }
          } catch {
            // Will be handled by interceptor
          }
        }
      },
      14 * 60 * 1000 // 14 minutes
    );

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (response.success && response.data) {
      const { user: userData, tokens } = response.data;
      tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(userData);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // Super admin has all permissions
      if (user.roles.some((r) => r.name === 'SUPER_ADMIN')) return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.roles.some((r) => r.name === role);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      if (user.roles.some((r) => r.name === 'SUPER_ADMIN')) return true;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.some((role) => user.roles.some((r) => r.name === role));
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAnyRole,
    }),
    [user, isLoading, login, logout, hasPermission, hasRole, hasAnyPermission, hasAnyRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
