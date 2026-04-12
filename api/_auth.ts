/**
 * Lightweight Clerk auth for individual Vercel functions.
 * Does NOT import the full @clerk/backend SDK — uses jose for JWT verification.
 */
import type { VercelRequest } from '@vercel/node'
import { getSQL } from './_db.js'

interface AuthResult {
  userId: string
  email?: string
  error?: string
}

/** Decode JWT payload without verification (for extracting sub/email). */
function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload
  } catch {
    return null
  }
}

/**
 * Verify Clerk JWT using the Clerk JWKS endpoint.
 * Much lighter than importing @clerk/backend (~2MB).
 */
async function verifyClerkToken(token: string): Promise<{ sub: string; email?: string } | null> {
  const clerkSecret = process.env.CLERK_SECRET_KEY
  if (!clerkSecret) return null

  const payload = decodePayload(token)
  if (!payload) return null

  const alg = (() => {
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())
      return header.alg
    } catch { return null }
  })()
  if (alg !== 'RS256' && alg !== 'ES256') return null

  const iss = typeof payload.iss === 'string' ? payload.iss : ''
  if (!iss.includes('clerk')) return null

  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose')
    const jwksUrl = `${iss}/.well-known/jwks.json`
    const JWKS = createRemoteJWKSet(new URL(jwksUrl))
    const { payload: verified } = await jwtVerify(token, JWKS, { clockTolerance: 60 })
    return { sub: verified.sub as string, email: verified.email as string | undefined }
  } catch {
    return null
  }
}

/**
 * Resolve Clerk user to a local DB user, creating one on first sign-in.
 * Uses raw SQL (neon serverless driver) — no Prisma import.
 */
async function resolveClerkUser(clerkId: string, email?: string): Promise<string> {
  const sql = getSQL()
  const existing = await sql`SELECT id FROM "User" WHERE "clerkId" = ${clerkId} LIMIT 1`
  if (existing.length > 0) return existing[0].id as string

  const fallbackEmail = email || `${clerkId.replace(/^user_/, '')}@clerk.placeholder`

  const byEmail = await sql`SELECT id FROM "User" WHERE email = ${fallbackEmail} LIMIT 1`
  if (byEmail.length > 0) {
    await sql`UPDATE "User" SET "clerkId" = ${clerkId} WHERE id = ${byEmail[0].id}`
    return byEmail[0].id as string
  }

  const randomPass = crypto.randomUUID()
  const created = await sql`
    INSERT INTO "User" (id, email, password, "clerkId", "createdAt")
    VALUES (gen_random_uuid(), ${fallbackEmail}, ${randomPass}, ${clerkId}, NOW())
    RETURNING id
  `
  return created[0].id as string
}

export async function authenticate(req: VercelRequest): Promise<AuthResult> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return { userId: '', error: 'Authentication required.' }
  const token = header.slice(7)

  const clerk = await verifyClerkToken(token)
  if (clerk?.sub) {
    try {
      const userId = await resolveClerkUser(clerk.sub, clerk.email)
      return { userId, email: clerk.email }
    } catch (err) {
      console.error('[auth] resolveClerkUser failed', err)
      return { userId: '', error: 'Auth database error.' }
    }
  }

  const secret = process.env.JWT_SECRET
  if (!secret) return { userId: '', error: 'Server misconfiguration.' }

  try {
    const { default: jwt } = await import('jsonwebtoken')
    const payload = jwt.verify(token, secret)
    if (typeof payload === 'string' || !payload.sub) return { userId: '', error: 'Invalid token.' }
    return { userId: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined }
  } catch {
    return { userId: '', error: 'Invalid or expired token.' }
  }
}
