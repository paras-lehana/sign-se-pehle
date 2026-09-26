/**
 * Vite build configuration for the web SPA.
 *
 * Responsibility: bundle the React app into dist/ for the server to serve on the same
 * origin. Boundary: the dev proxy only exists so `npm run dev` talks to a local server;
 * production never proxies because web and API share one Cloud Run origin.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Port the server listens on locally (matches the server's PORT default). */
const LOCAL_API_ORIGIN = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': LOCAL_API_ORIGIN,
    },
  },
});
