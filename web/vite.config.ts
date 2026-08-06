import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the same build works both under a GitHub Pages sub-path
  // (https://<user>.github.io/smartwill/) and at a host's domain root (Vercel).
  base: './',
  plugins: [react()],
  // Baked in once at `vite build` time (not per-request), so it identifies
  // which build is actually deployed — same value regardless of deploy
  // target (Vercel/AKS/Docker/local), since it's the build config itself
  // computing it rather than relying on a platform-specific env var.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/setupTests.ts'],
    },
  },
});
