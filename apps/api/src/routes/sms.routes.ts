import { Router, type Router as RouterType } from 'express';
import { smsService, SMSTemplate } from '../services/sms.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  sendSMSSchema,
  sendBulkSMSSchema,
  sendOTPSchema,
  verifyOTPSchema,
  smsLogQuerySchema,
} from '../validators/sms.validator.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// SMS Sending Routes
// ============================================

/**
 * @route   POST /api/v1/sms/send
 * @desc    Send a single SMS
 * @access  Private (settings:create)
 */
router.post(
  '/send',
  authorize('settings:create'),
  validate(sendSMSSchema),
  asyncHandler(async (req, res) => {
    const { to, message, template, data } = req.body;
    const result = await smsService.sendSMS({
      to,
      message,
      template: template as SMSTemplate,
      data,
    });
    return sendSuccess(res, result, result.success ? 'SMS sent' : 'SMS failed');
  })
);

/**
 * @route   POST /api/v1/sms/send-bulk
 * @desc    Send bulk SMS
 * @access  Private (settings:create)
 */
router.post(
  '/send-bulk',
  authorize('settings:create'),
  validate(sendBulkSMSSchema),
  asyncHandler(async (req, res) => {
    const { recipients, message, template, data } = req.body;
    const messages = recipients.map((to: string) => ({
      to,
      message,
      template: template as SMSTemplate,
      data,
    }));
    const results = await smsService.sendBulkSMS(messages);
    const successful = results.filter((r) => r.success).length;
    return sendSuccess(
      res,
      { results, successful, failed: results.length - successful },
      `Sent ${successful}/${results.length} SMS`
    );
  })
);

// ============================================
// OTP Routes
// ============================================

/**
 * @route   POST /api/v1/sms/send-otp
 * @desc    Send OTP code
 * @access  Private
 */
router.post(
  '/send-otp',
  validate(sendOTPSchema),
  asyncHandler(async (req, res) => {
    const { phone, purpose } = req.body;
    const result = await smsService.sendOTP(phone, purpose);
    return sendSuccess(res, { sent: result.success }, result.success ? 'OTP sent' : 'Failed to send OTP');
  })
);

/**
 * @route   POST /api/v1/sms/verify-otp
 * @desc    Verify OTP code
 * @access  Private
 */
router.post(
  '/verify-otp',
  validate(verifyOTPSchema),
  asyncHandler(async (req, res) => {
    const { phone, code, purpose } = req.body;
    const result = await smsService.verifyOTP(phone, code, purpose);
    if (!result.success) {
      return sendSuccess(res, { verified: false, error: result.error }, result.error);
    }
    return sendSuccess(res, { verified: true }, 'OTP verified');
  })
);

// ============================================
// Status & Balance Routes
// ============================================

/**
 * @route   GET /api/v1/sms/balance
 * @desc    Get SMS balance
 * @access  Private (settings:read)
 */
router.get(
  '/balance',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const balance = await smsService.getBalance();
    return sendSuccess(res, balance);
  })
);

/**
 * @route   GET /api/v1/sms/stats
 * @desc    Get SMS statistics
 * @access  Private (settings:read)
 */
router.get(
  '/stats',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const stats = await smsService.getStats();
    return sendSuccess(res, stats);
  })
);

/**
 * @route   GET /api/v1/sms/status/:messageId
 * @desc    Get SMS delivery status
 * @access  Private (settings:read)
 */
router.get(
  '/status/:messageId',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const status = await smsService.getDeliveryStatus(req.params.messageId);
    return sendSuccess(res, status);
  })
);

/**
 * @route   GET /api/v1/sms/logs
 * @desc    Get SMS logs
 * @access  Private (settings:read)
 */
router.get(
  '/logs',
  authorize('settings:read'),
  validate(smsLogQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await smsService.getLogs(req.query as any);
    return sendPaginated(res, result.data, result.pagination);
  })
);

export default router;
