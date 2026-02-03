import { Router, type Router as RouterType } from 'express';
import healthRoutes from './health.js';

const router: RouterType = Router();

// Health check routes
router.use('/health', healthRoutes);

// API version prefix routes will be added here
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// etc.

export default router;
