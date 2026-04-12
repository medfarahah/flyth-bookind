import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_cors.js'
import { getSQL } from '../_db.js'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = (req.body || {}) as { email?: string; password?: string }
  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email is required.' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  try {
    const bcrypt = (await import('bcryptjs')).default
    const jwt = (await import('jsonwebtoken')).default
    const secret = process.env.JWT_SECRET
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration.' })

    const hash = await bcrypt.hash(password, 10)
    const sql = getSQL()
    const rows = await sql`
      INSERT INTO "User" (id, email, password, "createdAt")
      VALUES (gen_random_uuid(), ${email.trim().toLowerCase()}, ${hash}, NOW())
      RETURNING id, email, "createdAt"
    `
    const user = rows[0]
    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' })

    return res.status(201).json({ token, user: { id: user.id, email: user.email } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Email already registered.' })
    }
    console.error('[auth/register]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
