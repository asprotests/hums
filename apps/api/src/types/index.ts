import type { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  tokens: TokenPair;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
