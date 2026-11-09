import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://snapshop:snapshop@localhost:5432/snapshop_test?schema=public',
      DIRECT_URL:
        'postgresql://snapshop:snapshop@localhost:5432/snapshop_test?schema=public',
      LOG_LEVEL: 'silent',
    },
  },
});
