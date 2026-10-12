import Joi from 'joi';
import { safeString } from './common.js';

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);

// At least 8 chars with a letter and a digit. Passwords are NOT html-stripped:
// they are hashed, never rendered, and altering them would break login.
const password = Joi.string()
  .min(8)
  .max(72) // bcrypt only uses the first 72 bytes
  .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  .messages({ 'string.pattern.base': 'Password must contain at least one letter and one number' });

export const registerSchema = {
  body: Joi.object({
    name: safeString().min(2).max(60).required(),
    email: email.required(),
    password: password.required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: email.required(),
    password: Joi.string().max(72).required(),
  }),
};
