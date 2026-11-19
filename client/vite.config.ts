/**
 * Vite, preview and Vitest configuration for the Burger Restaurant client.
 *
 * `defineConfig` comes from `vitest/config` rather than `vite` so the `test`
 * block below is typed and this stays the only config file in the package.
 *
 * Only the `/api` prefix is proxied, and it is forwarded unchanged. Express
 * serves the three tutorial routes from `/` and mounts the JSON API under
 * `/api`, so proxying `/` (or any catch-all) would put the client's own entry
 * page on the Express side and break those routes. The prefix must also reach
 * Express intact: `/api/categories` answered as `/api/categories` is the only
 * path that returns JSON, so nothing here may strip or alter it.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
