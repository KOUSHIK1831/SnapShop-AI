import 'dotenv/config';
import { z } from 'zod';

const DEV_ACCESS_SECRET = 'dev-access-secret-change-me-32-chars!!';
const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-me-32-chars!';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_URL: z.string().url().default('http://localhost:8080'),
    CORS_ORIGINS: z.string().default('http://localhost:8080'),

    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),

    JWT_ACCESS_SECRET: z.string().min(32).default(DEV_ACCESS_SECRET),
    JWT_REFRESH_SECRET: z.string().min(32).default(DEV_REFRESH_SECRET),
    ACCESS_TTL: z.string().default('15m'),
    REFRESH_TTL: z.string().default('30d'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('.storage'),
    PUBLIC_MEDIA_URL: z.string().default('http://localhost:4000/media'),

    EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('SnapShop AI <no-reply@snapshop.local>'),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;

    if (
      value.JWT_ACCESS_SECRET === DEV_ACCESS_SECRET ||
      value.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT secrets must be overridden in production',
      });
    }

    if (value.EMAIL_DRIVER === 'resend' && !value.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_DRIVER=resend',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
