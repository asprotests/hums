import { Router, type Router as RouterType } from 'express';
import { sendSuccess } from '../utils/index.js';

const router: RouterType = Router();

router.get('/', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/ready', (_req, res) => {
  // Add database connection check here when available
  sendSuccess(res, {
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

export default router;
