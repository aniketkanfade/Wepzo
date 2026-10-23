import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { API_SERVER_ORIGIN } from '../apiTarget.mjs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    proxy: {
      '/api': {
        target: API_SERVER_ORIGIN,
        changeOrigin: true
      },
      '/uploads': {
        target: API_SERVER_ORIGIN,
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173
  }
});
