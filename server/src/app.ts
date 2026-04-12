import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import { prisma } from './db.js'
import authRoutes from './routes/auth.routes.js'
import flightsRoutes from './routes/flights.routes.js'
import bookingsRoutes from './routes/bookings.routes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
]
if (process.env.VERCEL_URL) {
  defaultOrigins.push(`https://${process.env.VERCEL_URL}`)
}
const clientOrigins = [
  ...(process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  ...defaultOrigins,
].filter((v, i, a) => a.indexOf(v) === i)

/** Same-origin /api on Vercel — strip prefix so routes stay /health, /flights, … */
app.use((req, _res, next) => {
  const u = req.url || ''
  if (u.startsWith('/api')) {
    req.url = u.slice(4) || '/'
  }
  next()
})

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (clientOrigins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))

/** Race a promise against a timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

app.get('/health', async (_req, res) => {
  const info: Record<string, unknown> = {
    ok: true,
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown',
    hasDbUrl: !!process.env.DATABASE_URL,
  }

  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      ...info,
      ok: false,
      database: 'missing DATABASE_URL',
    })
    return
  }

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'DB ping')
    info.database = 'connected'
  } catch (err) {
    console.error('[health] database check failed', err)
    info.ok = false
    info.database = 'error'
    info.message = err instanceof Error ? err.message : 'unknown error'
    res.status(503).json(info)
    return
  }

  res.json(info)
})

app.use('/auth', authRoutes)
app.use('/flights', flightsRoutes)
app.use('/bookings', bookingsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
