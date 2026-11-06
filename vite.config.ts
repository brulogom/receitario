import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Receitário',
        short_name: 'Receitário',
        description: 'Encontre receitas caseiras e guarde as suas, do seu jeito.',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F4F7F5',
        theme_color: '#0B6B53',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // O campo share_target ainda não está nos tipos do plugin, mas é copiado para o manifesto.
        ...({
          share_target: {
            action: './',
            method: 'GET',
            params: { title: 'title', text: 'text', url: 'url' },
          },
        } as object),
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
