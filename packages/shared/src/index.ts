import { z } from 'zod';

/** Every role the platform understands. */
export const roleSchema = z.enum(['admin', 'seller', 'buyer', 'volunteer']);
export type Role = z.infer<typeof roleSchema>;

/**
 * Roles a brand-new account may self-select during onboarding.
 * `admin` and `volunteer` are never self-assignable.
 */
export const onboardingRoleSchema = z.enum(['seller', 'buyer']);
export type OnboardingRole = z.infer<typeof onboardingRoleSchema>;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** RFC 7807 problem details — the shape of every API error. */
export const apiErrorSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
