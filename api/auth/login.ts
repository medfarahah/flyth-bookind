import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_cors.js'
import { getSQL } from '../_db.js'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = (req.body || {}) as { email?: string; password?: string }
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    const bcrypt = (await import('bcryptjs')).default
    const jwt = (await import('jsonwebtoken')).default
    const secret = process.env.JWT_SECRET
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration.' })

    const sql = getSQL()
    const rows = await sql`SELECT id, email, password FROM "User" WHERE email = ${email.trim().toLowerCase()} LIMIT 1`
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' })

    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password as string)
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' })

    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' })
    return res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
