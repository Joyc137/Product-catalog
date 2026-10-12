import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

/**
 * Authenticates the request from a "Authorization: Bearer <jwt>" header.
 * The user is re-loaded from the database on every request so that a deleted
 * account or a changed role takes effect immediately, not when the token expires.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized();
  }

  const payload = verifyToken(token); // throws JsonWebTokenError / TokenExpiredError
  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  req.user = user;
  next();
});

/** Role-based authorization. Must run after `authenticate`. */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
