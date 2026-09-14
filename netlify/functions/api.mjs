import serverless from 'serverless-http'
import { app } from '../../server/index.js'
import { connectDatabase } from '../../server/db.js'

const expressHandler = serverless(app)
let databaseReady

export async function handler(event, context) {
  databaseReady ||= connectDatabase()
  await databaseReady
  return expressHandler(event, context)
}
