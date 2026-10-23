import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { API_SERVER_ORIGIN } from '../../apiTarget.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: API_SERVER_ORIGIN, changeOrigin: true },
      '/uploads': { target: API_SERVER_ORIGIN, changeOrigin: true },
    },
  },
})
