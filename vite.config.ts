import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    // Three.js alone is larger than Vite's default 500 kB warning. Expected for a 3D game.
    chunkSizeWarningLimit: 900,
  },
  test: {
    // The simulation in src/sim is pure TypeScript, so tests need no DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
