import { ApiError } from '../utils/ApiError.js';

const SOURCES = ['params', 'query', 'body'];

/**
 * Validates and normalises req.params / req.query / req.body against Joi schemas.
 * Unknown keys are rejected, so e.g. a client cannot smuggle `role: "admin"`
 * into the register payload. Validated values (with defaults and type coercion
 * applied) replace the raw input, so controllers only ever see clean data.
 */
export const validate = (schemas) => (req, _res, next) => {
  const details = [];

  for (const source of SOURCES) {
    const schema = schemas[source];
    if (!schema) continue;

    const { value, error } = schema.validate(req[source] ?? {}, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      details.push(
        ...error.details.map((d) => ({
          field: d.path.join('.') || source,
          message: d.message.replace(/"/g, ''),
        })),
      );
    } else {
      req[source] = value;
    }
  }

  if (details.length) {
    return next(ApiError.badRequest('Validation failed', details));
  }
  return next();
};
