import type { Actor } from '../auth/actor';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      valid: {
        // Validated payloads are intentionally loosely typed here; each route
        // narrows them through its Zod schema at the call site.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: any;
      };
    }
  }
}

export {};
