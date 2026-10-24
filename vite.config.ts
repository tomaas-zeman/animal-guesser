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
    // simulace na ~250 zvířatech běží několik minut
    testTimeout: 600_000,
  },
});
