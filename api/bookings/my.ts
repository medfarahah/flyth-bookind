import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_cors.js'
import { getSQL } from '../_db.js'
import { authenticate } from '../_auth.js'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

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
    console.error('[bookings/my]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
