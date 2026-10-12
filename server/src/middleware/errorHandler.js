import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translates known error types into safe client responses.
 * Never sends stack traces, raw Mongo messages or internal details to the client;
 * unexpected errors are logged server-side and reported as a generic 500.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    error = normalise(err);
  }

  if (error.statusCode >= 500 && !env.isTest) {
    // eslint-disable-next-line no-console
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { success: false, message: error.message };
  if (error.details) body.details = error.details;

  res.status(error.statusCode).json(body);
}

function normalise(err) {
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest('Validation failed', details);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`A record with this ${field} already exists`);
  }
  if (err?.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Session expired, please log in again');
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
    return ApiError.unauthorized('Invalid authentication token');
  }
  // express.json() locally; on Vercel the platform parses the body first and
  // throws its own 400 "Invalid JSON" error.
  if (err?.type === 'entity.parse.failed' || (err?.statusCode === 400 && /json/i.test(err.message))) {
    return ApiError.badRequest('Malformed JSON body');
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body too large');
  }
  if (err?.name === 'CorsError') {
    return ApiError.forbidden('Origin not allowed');
  }
  return new ApiError(500, 'Something went wrong. Please try again later.');
}
