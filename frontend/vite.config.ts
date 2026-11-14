import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: the SPA proxies /api to the BFF so API and bearer-token requests stay same-origin.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:8080' } },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
})
