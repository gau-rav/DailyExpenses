import { connectDatabase } from './repositories/databaseRepository.js'
import { app } from './app.js'

const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)

export { app }

if (process.env.NETLIFY !== 'true') {
  connectDatabase()
    .then(() => app.listen(port, () => console.log(`Auth server listening on http://localhost:${port}`)))
    .catch(error => {
      console.error('MongoDB connection failed', error)
      process.exitCode = 1
    })
}
