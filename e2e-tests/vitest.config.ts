import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '.',
  test: {
    globals: true,
    include: ['api-flows/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    globalSetup: ['api-flows/global-setup.ts'],
    pool: 'forks',
  },
});
