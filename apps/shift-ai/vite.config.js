import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// Capacitor-ready: relative base for native bundles; absolute for web deploys.
// envDir = monorepo root so NEXT_PUBLIC_* from .env.local is available (via envPrefix).
export default defineConfig({
  base: process.env.CAPACITOR_BUILD === '1' ? './' : '/',
  envDir: path.resolve(__dirname, '../..'),
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5176,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
