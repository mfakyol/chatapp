import pino from 'pino';
import { env } from './env';

/**
 * Application logger. JSON in production (machine-parseable), pretty-printed in
 * development. Level is configurable via `LOG_LEVEL`.
 */
export const logger = pino({
  level: env.logLevel,
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

export default logger;
