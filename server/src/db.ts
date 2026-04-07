import './loadEnv.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from './generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required (Neon pooled connection string).')
}

const adapter = new PrismaNeon({ connectionString })

export const prisma = new PrismaClient({ adapter })
