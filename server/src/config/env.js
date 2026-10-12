import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config({ quiet: true });

// Validate environment once at boot so a missing secret fails fast
// instead of surfacing later as a confusing runtime error.
const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  // Not Joi.uri(): it rejects valid multi-host replica-set URIs (host1,host2,...).
  MONGODB_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\/\S+$/)
    .required()
    .messages({ 'string.pattern.base': 'MONGODB_URI must start with mongodb:// or mongodb+srv://' }),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('2h'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n- ${error.details.map((d) => d.message).join('\n- ')}`);
  process.exit(1);
}

export const env = {
  nodeEnv: value.NODE_ENV,
  isProduction: value.NODE_ENV === 'production',
  isTest: value.NODE_ENV === 'test',
  port: value.PORT,
  mongoUri: value.MONGODB_URI,
  jwtSecret: value.JWT_SECRET,
  jwtExpiresIn: value.JWT_EXPIRES_IN,
  corsOrigins: value.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  bcryptRounds: value.BCRYPT_ROUNDS,
};
