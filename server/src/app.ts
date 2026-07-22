import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import passport from './config/passport';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import conversationRoutes from './routes/conversation.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

/** Build the Express app (middleware + routes). Import this in tests. */
export function createApp() {
  const app = express();

  // Behind the nginx proxy in production: trust it so client IPs (used by the
  // rate limiter) are read from X-Forwarded-For. Don't trust proxies in dev.
  if (env.isProd) app.set('trust proxy', 1);

  // `cross-origin` CORP lets the Next client (a different origin) load images
  // served from /uploads; the default `same-origin` would block them.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(passport.initialize());
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
