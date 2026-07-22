import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import createApp from './app';
import connectDB from './config/db';
import registerSocketHandlers from './sockets';
import { env } from './config/env';

const FORCE_EXIT_MS = 10_000;

/** Drain connections, close Socket.io + Mongo, with a hard force-exit fallback. */
function setupGracefulShutdown(server: http.Server, io: Server): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down gracefully...`);

    const forceTimer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('Could not close in time, forcing exit');
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
      // eslint-disable-next-line no-console
      console.error('Error during shutdown', err);
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
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
