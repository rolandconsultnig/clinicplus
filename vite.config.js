import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'static',
    emptyOutDir: true,
  },
  server: {
    port: 4305,
    // host: true allows access from any hostname including subdomains (e.g., elvis.localhost:4305)
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4300',
        changeOrigin: true,
      },
    },
  },
})

