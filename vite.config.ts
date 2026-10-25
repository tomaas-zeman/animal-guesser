import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative paths so the build works on GitHub Pages and in a subfolder
  base: './',
  build: {
    // three.js is big, a single bundle is fine for a small game
    chunkSizeWarningLimit: 1500,
  },
  test: {
    // the simulation on ~250 animals runs for several minutes
    testTimeout: 600_000,
  },
});
