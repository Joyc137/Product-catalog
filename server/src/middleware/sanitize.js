import mongoSanitize from 'express-mongo-sanitize';

/**
 * NoSQL-injection guard: strips any key that starts with "$" or contains "."
 * from req.body, req.query, req.params and req.headers, so a payload like
 * { "email": { "$gt": "" } } can never reach a Mongo query as an operator.
 * Joi validation is the second line of defence (it rejects non-string values
 * for string fields anyway).
 */
export const noSqlSanitize = mongoSanitize({ replaceWith: '_' });
