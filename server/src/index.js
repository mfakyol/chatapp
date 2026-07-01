require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const connectDB = require('./config/db');
const registerSocketHandlers = require('./sockets');

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  });

  registerSocketHandlers(io);
  app.set('io', io);

  const port = process.env.PORT || 4000;
  server.listen(port, () => console.log(`Server listening on port ${port}`));
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
