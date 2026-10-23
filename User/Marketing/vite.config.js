import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_SERVER_ORIGIN } from '../../apiTarget.mjs'

export default defineConfig({
    plugins: [react()],
    server: {
      port: 3002,
      strictPort: true,
      proxy: {
        '/api': { target: API_SERVER_ORIGIN, changeOrigin: true },
        '/uploads': { target: API_SERVER_ORIGIN, changeOrigin: true },
      },
    },
})
