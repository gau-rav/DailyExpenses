import { defineConfig } from 'vitest/config'
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
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: './src/test/setup.js',
      coverage: {
        provider: 'v8',
        include: ['src/utils/**/*.js', 'src/api/**/*.js'],
        reporter: ['text', 'html'],
      },
    },
  }
})
