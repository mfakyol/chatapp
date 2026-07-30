import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import passport from './config/passport';
import { env } from './config/env';
import { logger } from './config/logger';
import { createSessionMiddleware, SessionMiddleware } from './config/session';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import conversationRoutes from './routes/conversation.routes';
import attachmentRoutes from './routes/attachment.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

export function createApp(sessionMiddleware: SessionMiddleware = createSessionMiddleware()) {
  const app = express();

  if (env.isProd) app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.isProd ? env.clientUrl : true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(sessionMiddleware);
  app.use(passport.initialize());

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'error',
      db: dbUp ? 'up' : 'down',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/attachments', attachmentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
