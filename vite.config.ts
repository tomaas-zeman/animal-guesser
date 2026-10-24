import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relativní cesty, aby build fungoval na GitHub Pages i v podsložce
  base: './',
  build: {
    // three.js je velký, jeden balík je pro malou hru v pořádku
    chunkSizeWarningLimit: 1500,
  },
  test: {
    testTimeout: 120_000,
  },
});
