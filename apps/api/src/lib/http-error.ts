/** RFC 7807-friendly error used across services and middleware. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    readonly type = 'about:blank',
    readonly code?: string,
  ) {
    super(title);
    this.name = 'HttpError';
  }
}

export const badRequest = (detail: string, code?: string) =>
  new HttpError(400, 'Bad Request', detail, 'about:blank', code);

export const unauthorized = (
  detail = 'Authentication required',
  code?: string,
) => new HttpError(401, 'Unauthorized', detail, 'about:blank', code);

export const forbidden = (detail = 'You do not have access to this resource') =>
  new HttpError(403, 'Forbidden', detail);

export const notFound = (detail = 'Resource not found') =>
  new HttpError(404, 'Not Found', detail);

export const conflict = (detail: string, code?: string) =>
  new HttpError(409, 'Conflict', detail, 'about:blank', code);

export const unprocessable = (detail: string) =>
  new HttpError(422, 'Unprocessable Entity', detail);

export const tooManyRequests = (detail = 'Too many requests') =>
  new HttpError(429, 'Too Many Requests', detail);

export const serviceUnavailable = (detail: string) =>
  new HttpError(503, 'Service Unavailable', detail);

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError;
