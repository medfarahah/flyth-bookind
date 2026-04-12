/**
 * Lightweight health check — does NOT import the full Express app.
 * Diagnoses: does the function run at all? Is DATABASE_URL set? Can Neon connect?
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const start = Date.now()
  const info: Record<string, unknown> = {
    ok: true,
    region: process.env.VERCEL_REGION || 'unknown',
    hasDbUrl: !!process.env.DATABASE_URL,
    coldStartMs: start,
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ...info, ok: false, error: 'DATABASE_URL not set in Vercel env vars' })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT 1 AS ping`
    info.database = 'connected'
    info.pingMs = Date.now() - start
    info.rows = rows
  } catch (err) {
    info.ok = false
    info.database = 'error'
    info.error = err instanceof Error ? err.message : String(err)
    info.pingMs = Date.now() - start
    return res.status(503).json(info)
  }

  return res.json(info)
}
