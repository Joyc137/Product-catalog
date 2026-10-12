/**
 * Vercel serverless entry point. Every request is rewritten here (see vercel.json)
 * and handed to the same Express app used by `npm start`.
 *
 * The MongoDB connection is created once per warm function instance and reused
 * across invocations, instead of reconnecting on every request.
 */
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const app = createApp();
let connecting;

export default async function handler(req, res) {
  connecting ??= connectDB(env.mongoUri).catch((err) => {
    connecting = undefined; // allow the next request to retry
    throw err;
  });

  try {
    await connecting;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
  }

  return app(req, res);
}
