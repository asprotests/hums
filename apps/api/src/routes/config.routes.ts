import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { configService } from '../services/config.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { systemConfigSchema } from '../validators/config.validator.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { AppError } from '../utils/AppError.js';

const router: RouterType = Router();

// Get the directory path for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists for logo
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Configure multer for logo upload
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, logosDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `logo-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed (JPEG, PNG, SVG, WebP)', 400));
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max for logo
  },
}).single('logo');

// ============================================
// PUBLIC ROUTES (no authentication)
// ============================================

/**
 * @route   GET /api/v1/config/public
 * @desc    Get public config (no auth required)
 * @access  Public
 */
router.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const config = await configService.getPublicConfig();
    return sendSuccess(res, config);
  })
);

/**
 * @route   GET /api/v1/config/grade-scale
 * @desc    Get grading scale
 * @access  Public
 */
router.get(
  '/grade-scale',
  asyncHandler(async (_req, res) => {
    const gradeScale = await configService.getGradeScale();
    return sendSuccess(res, gradeScale);
  })
);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
 * @route   GET /api/v1/config
 * @desc    Get all config (admin only)
 * @access  Private (config:read)
 */
router.get(
  '/',
  authenticate,
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const config = await configService.getConfig();
    return sendSuccess(res, config);
  })
);

/**
 * @route   PATCH /api/v1/config
 * @desc    Update system configuration
 * @access  Private (config:update)
 */
router.patch(
  '/',
  authenticate,
  authorize('settings:update'),
  validate(systemConfigSchema),
  asyncHandler(async (req, res) => {
    const config = await configService.updateConfigs(req.body, req.user?.userId);
    return sendSuccess(res, config, 'Configuration updated successfully');
  })
);

/**
 * @route   POST /api/v1/config/logo
 * @desc    Upload university logo
 * @access  Private (config:update)
 */
router.post(
  '/logo',
  authenticate,
  authorize('settings:update'),
  (req, res, next) => {
    uploadLogo(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(AppError.badRequest('Logo file too large. Maximum size is 2MB'));
        }
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('No logo file provided');
    }

    // Get current logo to delete old one
    try {
      const currentConfig = await configService.getConfig();
      if (currentConfig.logo) {
        const oldFilename = currentConfig.logo.split('/').pop();
        if (oldFilename) {
          const oldPath = path.join(logosDir, oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
    } catch {
      // Ignore errors when deleting old logo
    }

    // Update config with new logo URL
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await configService.updateLogo(logoUrl, req.user?.userId);

    return sendSuccess(res, { logoUrl }, 'Logo uploaded successfully');
  })
);

/**
 * @route   POST /api/v1/config/reset
 * @desc    Reset configuration to defaults
 * @access  Private (config:update)
 */
router.post(
  '/reset',
  authenticate,
  authorize('settings:update'),
  asyncHandler(async (req, res) => {
    const config = await configService.resetToDefaults(req.user?.userId);
    return sendSuccess(res, config, 'Configuration reset to defaults');
  })
);

export default router;
