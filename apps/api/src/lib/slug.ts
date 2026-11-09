/** Turns a store name into a URL-safe slug. */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug;
}

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'buyer',
  'dashboard',
  'login',
  'onboarding',
  'register',
  'reset-password',
  'seller',
  'store',
  'track',
  'verify-email',
]);
