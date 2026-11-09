import type { Role } from '@prisma/client';

/** The authenticated principal every repository call must receive. */
export interface Actor {
  id: string;
  email: string;
  role: Role | null;
  tokenVersion: number;
}

export const hasRole = (actor: Actor | undefined, ...roles: Role[]): boolean =>
  Boolean(actor?.role && roles.includes(actor.role));

export const isAdmin = (actor: Actor | undefined): boolean =>
  actor?.role === 'admin';
