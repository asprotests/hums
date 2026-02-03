import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized('No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Invalid authorization format. Use: Bearer <token>');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw AppError.unauthorized('No token provided');
    }

    // Verify token and attach payload to request
    const payload = authService.verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        const payload = authService.verifyAccessToken(token);
        req.user = payload;
      }
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
};
