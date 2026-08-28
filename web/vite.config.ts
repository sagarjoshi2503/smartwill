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
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code into its own chunk so it stays
        // cached across app deploys instead of being re-downloaded on every
        // release alongside app code that changed.
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/setupTests.ts'],
      // Vitest skips generating a coverage report entirely if any test
      // fails, by default — this repo has a handful of pre-existing
      // failures (see web/CLAUDE.md) that predate and are unrelated to
      // whatever's being worked on, so without this a coverage run gives
      // no signal at all rather than a report with a caveat.
      reportOnFailure: true,
    },
  },
});
