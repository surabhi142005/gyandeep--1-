import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || env.VITE_API_BASE_URL || '';
  
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api':     { target: apiUrl, changeOrigin: true },
        '/storage': { target: apiUrl, changeOrigin: true },
        '/auth':    { target: apiUrl, changeOrigin: true },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Gyandeep - AI Smart Classroom',
          short_name: 'Gyandeep',
          description: 'AI-Powered Smart Classroom with attendance, quizzes and gamified learning',
          theme_color: '#4f46e5',
          background_color: '#f9fafb',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          categories: ['education'],
          icons: [
            { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/icons/icon-192x192.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'Dashboard',
              short_name: 'Dashboard',
              description: 'View your dashboard',
              url: '/dashboard',
              icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
            },
            {
              name: 'Attendance',
              short_name: 'Attendance',
              description: 'Mark your attendance',
              url: '/attendance',
              icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { 
                cacheName: 'google-fonts', 
                expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } 
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: { 
                cacheName: 'api-cache', 
                expiration: { maxEntries: 100, maxAgeSeconds: 300 }, 
                networkTimeoutSeconds: 10 
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              },
            },
            {
              urlPattern: /\/api\/notes\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'notes-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: /\/api\/grades\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'grades-cache',
                expiration: { maxEntries: 30, maxAgeSeconds: 1800 },
                networkTimeoutSeconds: 5,
              },
            },
          ],
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/storage\//],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        injectRegister: null,
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
      dedupe: ['react', 'react-dom', '@vladmandic/face-api'],
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            faceapi: ['@vladmandic/face-api'],
          },
        },
      },
    },
    define: {
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || ''),
      __VITE_WS_URL__: JSON.stringify(env.VITE_WS_URL || ''),
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@vladmandic/face-api'],
      exclude: ['@sentry/browser', '@sentry/profiling-web'],
    },
  };
});