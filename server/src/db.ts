import './loadEnv.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from './generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required. On Vercel: Project → Settings → Environment Variables → add DATABASE_URL (Neon *pooled* URL, host contains `-pooler`). Enable for Production and Preview.'
  )
}

/**
 * Singleton Prisma client for serverless (Vercel) + dev HMR.
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#serverless-environments-faas
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}
