import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    env: { LOG_LEVEL: 'silent' },
    hookTimeout: 120_000,
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
