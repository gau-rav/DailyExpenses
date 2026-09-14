import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function googleSheetsProxy(apiUrl) {
  return {
    name: 'google-sheets-local-proxy',
    configureServer(server) {
      server.middlewares.use('/api/expenses', async (req, res) => {
        try {
          let body = ''
          for await (const chunk of req) body += chunk

          const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          const upstream = await fetch(`${apiUrl}${query}`, {
            method: req.method,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: req.method === 'POST' ? body : undefined,
          })

          const responseText = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
          res.end(responseText)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const plugins = [react()]

  if (env.VITE_DATA_MODE === 'sheets' && env.VITE_EXPENSES_API_URL) {
    plugins.push(googleSheetsProxy(env.VITE_EXPENSES_API_URL))
  }

  return {
    plugins,
    server: {
      proxy: {
        '/auth': 'http://localhost:8787',
        '/health': 'http://localhost:8787',
      },
    },
  }
})
