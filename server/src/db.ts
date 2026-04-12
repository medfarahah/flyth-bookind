import './loadEnv.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from './generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL

/**
 * Singleton Prisma client for serverless (Vercel) + dev HMR.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. On Vercel: Project → Settings → Environment Variables → add DATABASE_URL.'
    )
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

/** Lazy: don't create until first use so missing DATABASE_URL doesn't crash the whole import. */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/** Convenience re-export for most call sites. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
