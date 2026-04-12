import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from './_cors.js'
import { getSQL } from './_db.js'

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  const from = typeof req.query.from === 'string' ? req.query.from.trim() : ''
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : ''
  const date = typeof req.query.date === 'string' ? req.query.date.trim() : ''

  if (!from || !to) return res.status(400).json({ error: '"from" and "to" are required.' })
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '"date" is required (YYYY-MM-DD).' })
  }

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  try {
    const sql = getSQL()
    const rows = await sql`
      SELECT id, airline, "from", "to", "departureTime", "arrivalTime", price, stops
      FROM "Flight"
      WHERE "departureTime" >= ${dayStart}::timestamptz
        AND "departureTime" <= ${dayEnd}::timestamptz
        AND "from" ILIKE ${'%' + from + '%'}
        AND "to" ILIKE ${'%' + to + '%'}
      ORDER BY "departureTime" ASC
      LIMIT 200
    `
    return res.json(rows.map((r: Record<string, unknown>) => ({ ...r, price: Number(r.price) })))
  } catch (err) {
    console.error('[flights]', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
