import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';
import { logger } from '../lib/logger';

export { HttpError } from '../lib/http-error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: `No route matches ${req.method} ${req.originalUrl}`,
      instance: req.originalUrl,
    });
};

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): HttpError {
  switch (error.code) {
    case 'P2002':
      return new HttpError(
        409,
        'Conflict',
        'A record with that value already exists',
      );
    case 'P2025':
      return new HttpError(
        404,
        'Not Found',
        'The requested record does not exist',
      );
    case 'P2003':
      return new HttpError(
        409,
        'Conflict',
        'The operation violates a foreign key constraint',
      );
    default:
      return new HttpError(
        500,
        'Database Error',
        'The database request failed',
      );
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let httpError: HttpError | null = null;

  if (error instanceof HttpError) {
    httpError = error;
  } else if (error instanceof ZodError) {
    res
      .status(422)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: 'Validation Failed',
        status: 422,
        detail: 'The request payload is invalid',
        instance: req.originalUrl,
        errors: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    return;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    httpError = fromPrisma(error);
  } else if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    httpError = new HttpError(
      503,
      'Service Unavailable',
      'The database is not reachable',
    );
  } else if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  ) {
    httpError = new HttpError(400, 'Bad Request', 'Malformed JSON body');
  } else if (
    error instanceof Error &&
    error.message.startsWith('Origin not allowed by CORS')
  ) {
    httpError = new HttpError(403, 'Forbidden', error.message);
  } else if (
    error instanceof Error &&
    'status' in error &&
    typeof (error as { status?: number }).status === 'number' &&
    (error as { status: number }).status < 500
  ) {
    const status = (error as { status: number }).status;
    httpError = new HttpError(status, 'Request Error', error.message);
  } else {
    logger.error(
      { err: error, url: req.originalUrl },
      'Unhandled request error',
    );
    httpError = new HttpError(500, 'Internal Server Error');
  }

  const isServerError = httpError.status >= 500;
  if (isServerError && httpError.status !== 503) {
    logger.error({ err: error, url: req.originalUrl }, httpError.title);
  }

  res
    .status(httpError.status)
    .type('application/problem+json')
    .json({
      type: httpError.type,
      title: httpError.title,
      status: httpError.status,
      ...(httpError.detail ? { detail: httpError.detail } : {}),
      ...(httpError.code ? { code: httpError.code } : {}),
      instance: req.originalUrl,
      ...(isServerError && shouldExposeStack()
        ? { stack: (error as Error)?.stack }
        : {}),
    });
};

function shouldExposeStack(): boolean {
  return process.env.NODE_ENV !== 'production';
}
