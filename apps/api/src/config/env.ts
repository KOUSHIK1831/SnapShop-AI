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
    API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
    CORS_ORIGINS: z.string().default('http://localhost:8080'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),

    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),

    JWT_ACCESS_SECRET: z.string().min(32).default(DEV_ACCESS_SECRET),
    JWT_REFRESH_SECRET: z.string().min(32).default(DEV_REFRESH_SECRET),
    JWT_ISSUER: z.string().default('snapshop-api'),
    JWT_AUDIENCE: z.string().default('snapshop-web'),
    ACCESS_TTL: z.string().default('15m'),
    REFRESH_TTL: z.string().default('30d'),
    REFRESH_COOKIE_NAME: z.string().default('snapshop_rt'),
    COOKIE_DOMAIN: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('.storage'),
    S3_ENDPOINT: z.string().trim().url().optional(),
    S3_REGION: z.string().trim().min(1).optional(),
    S3_BUCKET: z.string().trim().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),

    EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('SnapShop AI <no-reply@snapshop.local>'),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    AI_PROVIDER: z.enum(['auto', 'gemini', 'groq', 'mock']).default('auto'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),

    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_APP_SECRET: z.string().optional(),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),

    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (value.STORAGE_DRIVER === 'local') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STORAGE_DRIVER'],
          message: 'STORAGE_DRIVER=s3 is required in production',
        });
      }

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
    }

    if (value.STORAGE_DRIVER === 's3') {
      for (const key of [
        'S3_ENDPOINT',
        'S3_REGION',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
    }

    if (
      value.NODE_ENV === 'production' &&
      value.AI_PROVIDER === 'gemini' &&
      !value.GEMINI_API_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is required when AI_PROVIDER=gemini',
      });
    }

    if (
      value.NODE_ENV === 'production' &&
      value.AI_PROVIDER === 'groq' &&
      !value.GROQ_API_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GROQ_API_KEY'],
        message: 'GROQ_API_KEY is required when AI_PROVIDER=groq',
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
export const isTest = env.NODE_ENV === 'test';
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
