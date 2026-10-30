/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import marca from './src/lib/marca.json';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // El título de la pestaña y el título para compartir salen de src/lib/marca.json, como el resto de los textos.
      {
        name: 'marca-en-index-html',
        transformIndexHtml: (html: string) =>
          html.replaceAll('%MARCA_NOMBRE%', marca.nombre).replaceAll('%MARCA_ETIQUETA%', marca.etiqueta),
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Las specs de Playwright viven en e2e/ y las corre `npm run test:e2e`, no Vitest.
    test: { exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'] },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
