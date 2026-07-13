import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'tests/src/**/*.{test,spec}.{ts,tsx}',
      'tests/supabase/functions/**/*.{test,spec}.ts',
    ],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'cobertura'],
      thresholds: {
        statements: 30,
        branches: 20,
        functions: 30,
        lines: 30,
      },
      include: ['src/**/*.{ts,tsx}', 'supabase/functions/**/*.ts'],
      exclude: [
        'tests/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'supabase/functions/**/*.{test,spec}.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@capacitor/app': path.resolve(
        __dirname,
        './src/test/__mocks__/@capacitor/app.ts',
      ),
    },
  },
});
