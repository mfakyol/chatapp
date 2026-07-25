import pino from 'pino';
import { env } from './env';

const usePretty = !env.isProd && env.nodeEnv !== 'test';

export const logger = pino({
  level: env.logLevel,
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export default logger;
