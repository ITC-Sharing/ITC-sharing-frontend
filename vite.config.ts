import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // pdfjs-dist is big, and every route that reaches it is lazily imported
  // (PdfViewer <- DocumentPreviewModal <- the document and review screens). Left
  // to discover it on its own, Vite only pre-bundles it the first time one of
  // those routes is opened — and that re-optimisation invalidates the dep hash
  // the open page is already using, so the route's own dynamic import dies with
  // "504 Outdated Optimize Dep" and a failed module fetch. Naming it here gets
  // it bundled at server start instead, whatever route you land on first.
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    host: true,   // bind 0.0.0.0 so the container is reachable from the host
    port: 5173,
  },
})
