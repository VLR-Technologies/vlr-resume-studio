import { defineConfig } from 'vitest/config';
import type { PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import hosting from './vercel.json' with { type: 'json' };
const headers = Object.fromEntries(
  hosting.headers[0]!.headers.map((h) => [h.key, h.value]),
);
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'preview-security-on-revalidation',
      configurePreviewServer(server: PreviewServer) {
        // Vite's static 304 path returns before preview.headers is applied.
        // Set policy before static handling so cached workers stay isolated.
        server.middlewares.use((_request, response, next) => {
          for (const [key, value] of Object.entries(headers))
            response.setHeader(key, value);
          next();
        });
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: { headers },
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: new RegExp(
                'node_modules/(react|react-dom|react-router|scheduler)/',
              ),
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
