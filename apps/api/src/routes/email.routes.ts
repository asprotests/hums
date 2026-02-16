import { Router, type Router as RouterType } from 'express';
import { emailService } from '../services/email.service.js';
import { emailTemplateService, type EmailTemplate } from '../services/emailTemplate.service.js';
import { authenticate, authorize, validate } from '../middleware/index.js';
import {
  sendEmailSchema,
  sendBulkEmailsSchema,
  scheduleEmailSchema,
  updateTemplateSchema,
  testEmailSchema,
  previewTemplateSchema,
  emailLogQuerySchema,
} from '../validators/email.validator.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/index.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Email Sending Routes
// ============================================

/**
 * @route   POST /api/v1/email/send
 * @desc    Send an email immediately
 * @access  Private (settings:create)
 */
router.post(
  '/send',
  authorize('settings:create'),
  validate(sendEmailSchema),
  asyncHandler(async (req, res) => {
    const result = await emailService.sendEmail(req.body);
    return sendSuccess(res, result, result.success ? 'Email sent successfully' : 'Email failed to send');
  })
);

/**
 * @route   POST /api/v1/email/send-bulk
 * @desc    Send bulk emails
 * @access  Private (settings:create)
 */
router.post(
  '/send-bulk',
  authorize('settings:create'),
  validate(sendBulkEmailsSchema),
  asyncHandler(async (req, res) => {
    const results = await emailService.sendBulkEmails(req.body.emails);
    const successful = results.filter((r) => r.success).length;
    return sendSuccess(res, { results, successful, failed: results.length - successful }, `Sent ${successful}/${results.length} emails`);
  })
);

/**
 * @route   POST /api/v1/email/schedule
 * @desc    Schedule an email for later
 * @access  Private (settings:create)
 */
router.post(
  '/schedule',
  authorize('settings:create'),
  validate(scheduleEmailSchema),
  asyncHandler(async (req, res) => {
    const result = await emailService.scheduleEmail(req.body);
    return sendCreated(res, result, 'Email scheduled successfully');
  })
);

/**
 * @route   DELETE /api/v1/email/scheduled/:id
 * @desc    Cancel a scheduled email
 * @access  Private (settings:delete)
 */
router.delete(
  '/scheduled/:id',
  authorize('settings:delete'),
  asyncHandler(async (req, res) => {
    await emailService.cancelScheduledEmail(req.params.id);
    return sendSuccess(res, null, 'Scheduled email cancelled');
  })
);

/**
 * @route   GET /api/v1/email/queue/status
 * @desc    Get email queue statistics
 * @access  Private (settings:read)
 */
router.get(
  '/queue/status',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const stats = await emailService.getQueueStatus();
    return sendSuccess(res, stats);
  })
);

/**
 * @route   POST /api/v1/email/test
 * @desc    Send a test email
 * @access  Private (settings:create)
 */
router.post(
  '/test',
  authorize('settings:create'),
  validate(testEmailSchema),
  asyncHandler(async (req, res) => {
    const result = await emailService.sendTestEmail(req.body.to, req.body.template);
    return sendSuccess(res, result, result.success ? 'Test email sent' : 'Test email failed');
  })
);

/**
 * @route   GET /api/v1/email/logs
 * @desc    Get email logs
 * @access  Private (settings:read)
 */
router.get(
  '/logs',
  authorize('settings:read'),
  validate(emailLogQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await emailService.getEmailLogs(req.query as any);
    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/email/verify
 * @desc    Verify SMTP connection
 * @access  Private (settings:read)
 */
router.get(
  '/verify',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const connected = await emailService.verifyConnection();
    return sendSuccess(res, { connected }, connected ? 'SMTP connected' : 'SMTP connection failed');
  })
);

// ============================================
// Template Routes
// ============================================

/**
 * @route   GET /api/v1/email/templates
 * @desc    Get all email templates
 * @access  Private (settings:read)
 */
router.get(
  '/templates',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const category = req.query.category as string | undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const templates = await emailTemplateService.getTemplates({ category, isActive });
    return sendSuccess(res, templates);
  })
);

/**
 * @route   GET /api/v1/email/templates/:name
 * @desc    Get a specific template
 * @access  Private (settings:read)
 */
router.get(
  '/templates/:name',
  authorize('settings:read'),
  asyncHandler(async (req, res) => {
    const template = await emailTemplateService.getTemplate(req.params.name as EmailTemplate);
    return sendSuccess(res, template);
  })
);

/**
 * @route   PATCH /api/v1/email/templates/:id
 * @desc    Update a template
 * @access  Private (settings:update)
 */
router.patch(
  '/templates/:id',
  authorize('settings:update'),
  validate(updateTemplateSchema),
  asyncHandler(async (req, res) => {
    const template = await emailTemplateService.updateTemplate(req.params.id, req.body);
    return sendSuccess(res, template, 'Template updated successfully');
  })
);

/**
 * @route   POST /api/v1/email/templates/:name/reset
 * @desc    Reset template to default
 * @access  Private (settings:update)
 */
router.post(
  '/templates/:name/reset',
  authorize('settings:update'),
  asyncHandler(async (req, res) => {
    const template = await emailTemplateService.resetToDefault(req.params.name as EmailTemplate);
    return sendSuccess(res, template, 'Template reset to default');
  })
);

/**
 * @route   POST /api/v1/email/templates/:name/preview
 * @desc    Preview a rendered template
 * @access  Private (settings:read)
 */
router.post(
  '/templates/:name/preview',
  authorize('settings:read'),
  validate(previewTemplateSchema),
  asyncHandler(async (req, res) => {
    const preview = await emailTemplateService.previewTemplate(req.params.name as EmailTemplate, req.body.data);
    return sendSuccess(res, preview);
  })
);

/**
 * @route   POST /api/v1/email/templates/:name/test
 * @desc    Send test email with template
 * @access  Private (settings:create)
 */
router.post(
  '/templates/:name/test',
  authorize('settings:create'),
  validate(testEmailSchema),
  asyncHandler(async (req, res) => {
    const result = await emailService.sendTestEmail(req.body.to, req.params.name as EmailTemplate);
    return sendSuccess(res, result, result.success ? 'Test email sent' : 'Test email failed');
  })
);

/**
 * @route   POST /api/v1/email/templates/seed
 * @desc    Seed default templates
 * @access  Private (settings:create)
 */
router.post(
  '/templates/seed',
  authorize('settings:create'),
  asyncHandler(async (_req, res) => {
    await emailTemplateService.seedDefaultTemplates();
    return sendSuccess(res, null, 'Default templates seeded');
  })
);

export default router;
