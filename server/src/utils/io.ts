import type { Request } from 'express';
import type { Server } from 'socket.io';

export const getIo = (req: Request): Server => req.app.get('io') as Server;
