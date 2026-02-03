import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware to check if user has required permission(s)
 * @param permissions - Single permission or array of permissions (any match grants access)
 */
export const authorize = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Super admin bypasses all permission checks
      if (req.user.roles.includes('SUPER_ADMIN')) {
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some((permission) =>
        req.user!.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw AppError.forbidden(
          `Access denied. Required permission: ${permissions.join(' or ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has required role(s)
 * @param roles - Single role or array of roles (any match grants access)
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Super admin bypasses all role checks
      if (req.user.roles.includes('SUPER_ADMIN')) {
        return next();
      }

      // Check if user has any of the required roles
      const hasRole = roles.some((role) => req.user!.roles.includes(role));

      if (!hasRole) {
        throw AppError.forbidden(
          `Access denied. Required role: ${roles.join(' or ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has ALL required permissions
 * @param permissions - Array of permissions (all must match)
 */
export const authorizeAll = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Super admin bypasses all permission checks
      if (req.user.roles.includes('SUPER_ADMIN')) {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every((permission) =>
        req.user!.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        throw AppError.forbidden(
          `Access denied. Required permissions: ${permissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
