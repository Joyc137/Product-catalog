import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  await connectDB(env.mongoUri);
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');

  const server = createApp().listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
