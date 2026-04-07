import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import flightsRoutes from './routes/flights.routes.js'
import bookingsRoutes from './routes/bookings.routes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
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

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRoutes)
app.use('/flights', flightsRoutes)
app.use('/bookings', bookingsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
