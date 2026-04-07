/**
 * Vercel serverless — handles /api and /api/*
 * @see https://vercel.com/docs/functions/configuring-functions/duration
 */
import serverless from 'serverless-http'
import app from '../server/src/app.js'

/** Pro: up to 300s; Hobby: capped (often 10s). Raise plan or optimize DB if timeouts persist. */
export const config = {
  maxDuration: 60,
  memory: 3008,
}

export default serverless(app)
