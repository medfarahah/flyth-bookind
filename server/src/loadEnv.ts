import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Load `server/.env` and override inherited machine env (e.g. stale DIRECT_URL). */
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(serverRoot, '.env'), override: true })
