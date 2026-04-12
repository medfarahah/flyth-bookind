/**
 * On Vercel, env is injected by the platform — skip dotenv entirely.
 * Locally, load server/.env.
 */
if (!process.env.VERCEL) {
  try {
    const { config } = await import('dotenv')
    const { dirname, resolve } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    config({ path: resolve(serverRoot, '.env'), override: true })
  } catch {
    // dotenv or path resolution failed — fall through to process.env
  }
}
