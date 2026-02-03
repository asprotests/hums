import type { Request, Response, NextFunction } from 'express';
import type { AsyncHandler } from '../types/index.js';

export const asyncHandler = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
