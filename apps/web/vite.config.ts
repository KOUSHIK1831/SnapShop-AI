import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG || '',
            project: process.env.SENTRY_PROJECT || '',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: mode !== 'production' ? 'hidden' : true,
  },
}));
