import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import flightsRoutes from './routes/flights.routes.js'
import bookingsRoutes from './routes/bookings.routes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = Number(process.env.PORT) || 4000
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
