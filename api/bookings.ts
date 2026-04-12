import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from './_cors.js'
import { getSQL } from './_db.js'
import { authenticate } from './_auth.js'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method === 'GET') return listBookings(req, res)
  if (req.method === 'POST') return createBooking(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function listBookings(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req)
  if (auth.error) return res.status(401).json({ error: auth.error })

  try {
    const sql = getSQL()
    const rows = await sql`
      SELECT b.id, b."totalPrice", b.passengers, b."createdAt",
             f.id AS "flightId", f.airline, f."from", f."to",
             f."departureTime", f."arrivalTime", f.price AS "flightPrice", f.stops
      FROM "Booking" b
      JOIN "Flight" f ON f.id = b."flightId"
      WHERE b."userId" = ${auth.userId}::uuid
      ORDER BY b."createdAt" DESC
      LIMIT 100
    `
    return res.json(rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      totalPrice: Number(r.totalPrice),
      passengers: r.passengers,
      createdAt: r.createdAt,
      flight: {
        id: r.flightId,
        airline: r.airline,
        from: r.from,
        to: r.to,
        departureTime: r.departureTime,
        arrivalTime: r.arrivalTime,
        price: Number(r.flightPrice),
        stops: r.stops,
      },
    })))
  } catch (err) {
    console.error('[bookings/list]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}

async function createBooking(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req)
  if (auth.error) return res.status(401).json({ error: auth.error })

  const { flightId, passengers } = (req.body || {}) as {
    flightId?: string
    passengers?: { fullName?: string; email?: string; phone?: string }[]
  }

  if (!flightId || !/^[0-9a-f-]{36}$/i.test(flightId)) {
    return res.status(400).json({ error: 'Valid flightId is required.' })
  }
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return res.status(400).json({ error: 'At least one passenger is required.' })
  }
  for (const p of passengers) {
    if (!p?.fullName?.trim() || !p?.email?.trim() || !p?.phone?.trim()) {
      return res.status(400).json({ error: 'Each passenger needs fullName, email, phone.' })
    }
  }

  try {
    const sql = getSQL()
    const flights = await sql`SELECT id, price FROM "Flight" WHERE id = ${flightId}::uuid LIMIT 1`
    if (flights.length === 0) return res.status(404).json({ error: 'Flight not found.' })

    const unitPrice = Number(flights[0].price)
    const totalPrice = unitPrice * passengers.length

    const bookings = await sql`
      INSERT INTO "Booking" (id, "userId", "flightId", passengers, "totalPrice", "createdAt")
      VALUES (gen_random_uuid(), ${auth.userId}::uuid, ${flightId}::uuid, ${JSON.stringify(passengers)}::jsonb, ${totalPrice}, NOW())
      RETURNING id, "totalPrice", passengers, "createdAt"
    `
    const b = bookings[0]
    return res.status(201).json({
      id: b.id,
      totalPrice: Number(b.totalPrice),
      passengers: b.passengers,
      createdAt: b.createdAt,
    })
  } catch (err) {
    console.error('[bookings/create]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
