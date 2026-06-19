import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
