import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the API is proxied, so the browser sees a single origin.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
