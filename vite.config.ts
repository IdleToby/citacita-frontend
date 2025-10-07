//vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // target: 'http://172.188.48.228:8080',
        // target: 'http://192.168.0.116:8080',
        changeOrigin: true,
      },
    },
    host: '0.0.0.0',
    port: 5173,
  },
  define: {
    global: 'window',
  },
  build: {
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: ['console.log'],
      },
    },
  },
})
