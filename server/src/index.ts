import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import createApp from './app';
import connectDB from './config/db';
import registerSocketHandlers from './sockets';
import { env } from './config/env';
import { logger } from './config/logger';

const FORCE_EXIT_MS = 10_000;

/** Drain connections, close Socket.io + Mongo, with a hard force-exit fallback. */
function setupGracefulShutdown(server: http.Server, io: Server): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    const forceTimer = setTimeout(() => {
      logger.error('Could not close in time, forcing exit');
      process.exit(1);
    }, FORCE_EXIT_MS);
    forceTimer.unref();

    try {
      io.disconnectSockets(true);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mongoose.connection.close();
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  registerSocketHandlers(io);
  app.set('io', io);

  setupGracefulShutdown(server, io);

  server.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
