import type { Request } from 'express';
import type { Server } from 'socket.io';

/** Retrieve the Socket.io server instance stashed on the Express app. */
export const getIo = (req: Request): Server => req.app.get('io') as Server;
