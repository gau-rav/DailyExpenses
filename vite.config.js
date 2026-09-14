import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://localhost:8787',
        '/health': 'http://localhost:8787',
      },
    },
  }
})
