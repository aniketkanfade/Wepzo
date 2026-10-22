import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: env.VITE_API_PROXY_TARGET ? {
        '/api': { target: env.VITE_API_PROXY_TARGET, changeOrigin: true },
        '/uploads': { target: env.VITE_API_PROXY_TARGET, changeOrigin: true },
      } : undefined,
    },
  }
})