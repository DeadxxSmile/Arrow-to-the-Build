import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code and the large skill catalog into their own chunks so
        // they cache independently and app-code edits do not force re-downloading them.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('react')) return 'vendor-react'
            return 'vendor'
          }
          if (id.includes('eso-skill-catalog.json')) return 'catalog'
        },
      },
    },
  },
  resolve: {
    extensions: ['.mjs', '.jsx', '.js', '.mts', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})
