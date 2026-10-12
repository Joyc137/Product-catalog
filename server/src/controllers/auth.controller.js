import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';

const authResponse = (user) => ({ token: signToken(user), user: user.toJSON() });

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Role is always "user" here; admins are provisioned by the seed script only.
  const user = await User.create({ name, email, password, role: ROLES.USER });
  res.status(201).json(authResponse(user));
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for unknown email and wrong password: don't leak which emails exist.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json(authResponse(user));
}

export async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}
