import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the same build works both under a GitHub Pages sub-path
  // (https://<user>.github.io/smartwill/) and at a host's domain root (Vercel).
  base: './',
  plugins: [react()],
});
