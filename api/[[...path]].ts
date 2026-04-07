/**
 * Vercel serverless — handles /api and /api/*
 * @see https://vercel.com/docs/functions/configuring-functions/duration
 */
import serverless from 'serverless-http'
import app from '../server/src/app.js'

/**
 * Vercel Node serverless limits (this is not Next.js Route Handlers).
 * Next.js uses `export const maxDuration = 60` in `route.ts`; Express entry uses `config` here.
 * Hobby plan often caps at ~10s regardless — optimize DB + external calls.
 */
export const config = {
  maxDuration: 60,
  memory: 3008,
}

export default serverless(app)
