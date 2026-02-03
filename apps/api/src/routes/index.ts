import { Router, type Router as RouterType } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.routes.js';

const router: RouterType = Router();

// Health check routes
router.use('/health', healthRoutes);

// API v1 routes
router.use('/api/v1/auth', authRoutes);

// Future routes
// router.use('/api/v1/users', userRoutes);
// router.use('/api/v1/students', studentRoutes);
// etc.

export default router;
