import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Nom du dépôt GitHub : l'app est servie sous https://<utilisateur>.github.io/Ma-super-app-de-musique/
const base = '/Ma-super-app-de-musique/';

const sha = (process.env.GITHUB_SHA ?? '').slice(0, 7);

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version + (sha ? ` (${sha})` : ' (dev)'))
  },
  build: {
    rollupOptions: {
      // Les pages de test (dossier tests/) sont publiées à côté de l'app.
      input: {
        app: 'index.html',
        'test-lecture': 'tests/test-lecture.html'
      }
    }
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ma super app de musique',
        short_name: 'Musique',
        description: 'Lecteur de musique : fichiers locaux, Google Drive et YouTube.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f0f',
        theme_color: '#0f0f0f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Seul le « shell » de l'app est mis en cache ; la page de test reste servie par le réseau.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['tests/**'],
        navigateFallbackDenylist: [/\/tests\//]
      }
    })
  ]
});
