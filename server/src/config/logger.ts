import pino from 'pino';
import { env } from './env';

/**
 * Application logger. JSON in production (machine-parseable), pretty-printed in
 * development. Level is configurable via `LOG_LEVEL`.
 */
// Pretty-print only in local dev; production emits JSON and tests stay quiet
// (a pino-pretty transport spawns a worker that would keep Vitest alive).
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
