import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'robots.txt'],
      manifest: {
        name: 'JRV Inventory',
        short_name: 'JRV Inventory',
        description: 'Control de inventario para pedidos de comidas familiares',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        categories: ['business', 'food'],
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        screenshots: [],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/identitytoolkit\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
