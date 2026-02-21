import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('3001'),
  API_HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('30m'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Email (SMTP)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Hormuud University'),
  EMAIL_FROM_ADDRESS: z.string().default('noreply@hormuud.edu.so'),
  EMAIL_REPLY_TO: z.string().default('support@hormuud.edu.so'),

  // SMS Configuration
  SMS_PROVIDER: z.string().default('africa_talking'), // africa_talking, twilio, etc.
  SMS_API_KEY: z.string().optional(),
  SMS_API_SECRET: z.string().optional(),
  SMS_SENDER_ID: z.string().default('HORMUUD-UNI'),
  SMS_COST_PER_SMS: z.string().default('0.02'),

  // Africa's Talking SMS
  AT_API_KEY: z.string().optional(),
  AT_USERNAME: z.string().optional(),

  // EVC Plus (Hormuud Mobile Money)
  EVC_MERCHANT_ID: z.string().optional(),
  EVC_API_KEY: z.string().optional(),
  EVC_API_SECRET: z.string().optional(),
  EVC_BASE_URL: z.string().default('https://api.waafi.com'),

  // ZAAD (Telesom Mobile Money)
  ZAAD_MERCHANT_ID: z.string().optional(),
  ZAAD_API_KEY: z.string().optional(),
  ZAAD_BASE_URL: z.string().default('https://api.zaad.net'),

  // SAHAL (Golis Mobile Money)
  SAHAL_MERCHANT_ID: z.string().optional(),
  SAHAL_API_KEY: z.string().optional(),
  SAHAL_BASE_URL: z.string().default('https://api.sahal.net'),

  // Payment Gateway General
  PAYMENT_WEBHOOK_SECRET: z.string().default('payment-webhook-secret'),
  PAYMENT_SESSION_TIMEOUT: z.string().default('600000'), // 10 minutes
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
