import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  // Pin the algorithm so a token signed with "none" or another alg is rejected.
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
}
