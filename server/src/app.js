import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { noSqlSanitize } from './middleware/sanitize.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  // Behind Render/Railway/Nginx the client IP comes from X-Forwarded-For;
  // needed for correct rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  // Explicit allow-list. Auth uses a Bearer header (not cookies), so credentials
  // are disabled and no wildcard + credentials combination is ever possible.
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / non-browser clients (curl, server-to-server) with no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        const err = new Error('Not allowed by CORS');
        err.name = 'CorsError';
        return callback(err);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '10kb' }));
  app.use(noSqlSanitize);

  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please slow down' },
    }),
  );

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
