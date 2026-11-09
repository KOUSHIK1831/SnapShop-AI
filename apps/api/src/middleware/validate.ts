import type { ZodType } from 'zod';
import type { RequestHandler } from 'express';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/**
 * Parses and replaces request input with the validated values.
 * Controllers read `req.valid` instead of the raw Express objects.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      req.valid = {
        body: schemas.body ? schemas.body.parse(req.body) : req.body,
        query: schemas.query ? schemas.query.parse(req.query) : req.query,
        params: schemas.params ? schemas.params.parse(req.params) : req.params,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
