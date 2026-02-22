import { Router, type Router as RouterType } from 'express';
import { authenticate, authorize, validate } from '../middleware/index.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';
import { twoFactorService } from '../services/twoFactor.service.js';
import {
  verifyTOTPSetupSchema,
  sendOTPSchema,
  verifyOTPSchema,
  verify2FASchema,
  enable2FASchema,
  disable2FASchema,
  regenerateBackupCodesSchema,
  adminReset2FASchema,
} from '../validators/twoFactorNotification.validator.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/2fa/totp/setup
 * @desc    Initiate TOTP setup - returns QR code and secret
 * @access  Private
 */
router.post(
  '/totp/setup',
  asyncHandler(async (req, res) => {
    const result = await twoFactorService.setupTOTP(req.user!.userId);
    sendCreated(res, result, 'TOTP setup initiated');
  })
);

/**
 * @route   POST /api/v1/2fa/totp/verify
 * @desc    Verify TOTP setup and enable 2FA
 * @access  Private
 */
router.post(
  '/totp/verify',
  validate(verifyTOTPSetupSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await twoFactorService.verifyTOTPSetup(req.user!.userId, code);
    sendSuccess(res, result, 'TOTP enabled successfully');
  })
);

/**
 * @route   POST /api/v1/2fa/otp/send
 * @desc    Send OTP via SMS or Email
 * @access  Private
 */
router.post(
  '/otp/send',
  validate(sendOTPSchema),
  asyncHandler(async (req, res) => {
    const { method } = req.body;
    const result = await twoFactorService.sendOTP(req.user!.userId, method);
    sendSuccess(res, result, `OTP sent via ${method}`);
  })
);

/**
 * @route   POST /api/v1/2fa/otp/verify
 * @desc    Verify OTP code
 * @access  Private
 */
router.post(
  '/otp/verify',
  validate(verifyOTPSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const isValid = await twoFactorService.verifyOTP(req.user!.userId, code);
    sendSuccess(res, { verified: isValid }, isValid ? 'OTP verified' : 'Invalid OTP');
  })
);

/**
 * @route   POST /api/v1/2fa/verify
 * @desc    Verify 2FA code (TOTP or backup code)
 * @access  Private
 */
router.post(
  '/verify',
  validate(verify2FASchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await twoFactorService.verify2FA(req.user!.userId, code);
    sendSuccess(res, result, result.success ? '2FA verified' : '2FA verification failed');
  })
);

/**
 * @route   POST /api/v1/2fa/enable
 * @desc    Enable 2FA with specific method
 * @access  Private
 */
router.post(
  '/enable',
  validate(enable2FASchema),
  asyncHandler(async (req, res) => {
    const { method } = req.body;
    await twoFactorService.enable2FA(req.user!.userId, method);
    sendSuccess(res, { enabled: true, method }, '2FA enabled');
  })
);

/**
 * @route   POST /api/v1/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post(
  '/disable',
  validate(disable2FASchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    await twoFactorService.disable2FA(req.user!.userId, code);
    sendSuccess(res, { enabled: false }, '2FA disabled');
  })
);

/**
 * @route   GET /api/v1/2fa/status
 * @desc    Get 2FA status for current user
 * @access  Private
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = await twoFactorService.get2FAStatus(req.user!.userId);
    sendSuccess(res, status);
  })
);

/**
 * @route   GET /api/v1/2fa/backup-codes
 * @desc    Get backup codes count
 * @access  Private
 */
router.get(
  '/backup-codes',
  asyncHandler(async (req, res) => {
    const result = await twoFactorService.getBackupCodes(req.user!.userId);
    sendSuccess(res, result);
  })
);

/**
 * @route   POST /api/v1/2fa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post(
  '/backup-codes/regenerate',
  validate(regenerateBackupCodesSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const backupCodes = await twoFactorService.regenerateBackupCodes(req.user!.userId, code);
    sendSuccess(res, { backupCodes }, 'Backup codes regenerated');
  })
);

/**
 * @route   POST /api/v1/2fa/admin/reset/:userId
 * @desc    Admin reset 2FA for a user
 * @access  Private (Admin)
 */
router.post(
  '/admin/reset/:userId',
  authorize('users:manage'),
  validate(adminReset2FASchema, 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await twoFactorService.adminReset2FA(userId, req.user!.userId);
    sendSuccess(res, { reset: true }, '2FA reset for user');
  })
);

export default router;
