import type { NextFunction, Request, Response } from 'express'
import { createClerkClient, verifyToken } from '@clerk/backend'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { prisma } from '../db.js'
import { AppError } from '../utils/AppError.js'

const clerkSecret = process.env.CLERK_SECRET_KEY

function isLikelyClerkJwt(token: string): boolean {
  const decoded = jwt.decode(token, { complete: true })
  const alg = decoded?.header && typeof decoded.header === 'object' && 'alg' in decoded.header
    ? (decoded.header as { alg?: string }).alg
    : undefined
  return alg === 'RS256' || alg === 'ES256'
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return next(new AppError('Authentication required.', 401))
    }
    const token = header.slice(7)

    if (clerkSecret) {
      try {
        const payload = await verifyToken(token, {
          secretKey: clerkSecret,
          clockSkewInMs: 60_000,
        })
        const clerkId = payload.sub

        let user = await prisma.user.findFirst({ where: { clerkId } })

        if (!user) {
          const client = createClerkClient({ secretKey: clerkSecret })
          const cu = await client.users.getUser(clerkId)
          const email =
            cu.primaryEmailAddress?.emailAddress ??
            cu.emailAddresses[0]?.emailAddress ??
            `${clerkId.replace(/^user_/, '')}@clerk.placeholder`

          const existing = await prisma.user.findUnique({ where: { email } })
          if (existing) {
            user = await prisma.user.update({
              where: { id: existing.id },
              data: { clerkId },
            })
          } else {
            user = await prisma.user.create({
              data: {
                email,
                password: await bcrypt.hash(randomUUID(), 10),
                clerkId,
              },
            })
          }
        }

        req.userId = user.id
        req.userEmail = user.email
        return next()
      } catch (e) {
        if (isLikelyClerkJwt(token)) {
          const msg =
            e instanceof Error && e.message
              ? e.message
              : 'Session expired or invalid. Please sign in again.'
          return next(new AppError(msg, 401))
        }
        // fall through to legacy JWT
      }
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return next(new AppError('Server misconfiguration.', 500))
    }

    try {
      const payload = jwt.verify(token, secret)
      if (typeof payload === 'string' || !payload.sub || typeof payload.sub !== 'string') {
        return next(new AppError('Invalid or expired token.', 401))
      }
      req.userId = payload.sub
      req.userEmail = typeof payload.email === 'string' ? payload.email : undefined
      next()
    } catch {
      next(new AppError('Invalid or expired token.', 401))
    }
  })().catch(next)
}
