import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Vercel injects env in `process.env` — there is no `server/.env` in production.
 * Only load a local file when not on Vercel so dashboard secrets are never overridden.
 */
if (!process.env.VERCEL) {
  config({ path: resolve(serverRoot, '.env'), override: true })
}
