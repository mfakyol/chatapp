import http from 'http';
import { Server } from 'socket.io';
import createApp from './app';
import connectDB from './config/db';
import registerSocketHandlers from './sockets';
import { env } from './config/env';

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  registerSocketHandlers(io);
  app.set('io', io);

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
