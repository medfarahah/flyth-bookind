import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_cors.js'

export const config = { maxDuration: 15 }

const SERP_BASE = 'https://serpapi.com/search.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'SerpAPI not configured.' })

  const departure_id = typeof req.query.departure_id === 'string' ? req.query.departure_id.trim().toUpperCase() : ''
  const arrival_id = typeof req.query.arrival_id === 'string' ? req.query.arrival_id.trim().toUpperCase() : ''
  const outbound_date =
    typeof req.query.outbound_date === 'string' ? req.query.outbound_date.trim()
    : typeof req.query.date === 'string' ? req.query.date.trim()
    : ''

  if (!departure_id || !arrival_id) return res.status(400).json({ error: 'departure_id and arrival_id required.' })
  if (!outbound_date) return res.status(400).json({ error: 'outbound_date required.' })

  const currency = typeof req.query.currency === 'string' && req.query.currency.trim() ? req.query.currency.trim() : 'USD'
  const type = typeof req.query.type === 'string' && req.query.type.trim() ? req.query.type.trim() : '2'

  const url = new URL(SERP_BASE)
  url.searchParams.set('engine', 'google_flights')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('departure_id', departure_id)
  url.searchParams.set('arrival_id', arrival_id)
  url.searchParams.set('outbound_date', outbound_date)
  url.searchParams.set('currency', currency)
  url.searchParams.set('type', type)

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8000)
  try {
    const serpRes = await fetch(url.toString(), { signal: ac.signal })
    clearTimeout(timer)
    if (!serpRes.ok) return res.status(502).json({ error: `SerpAPI HTTP ${serpRes.status}` })
    const data = await serpRes.json() as { error?: string; best_flights?: unknown[]; other_flights?: unknown[] }
    if (data.error) return res.status(502).json({ error: data.error })

    const offers = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
    const rows = offers.map((o: any) => {
      const legs = o.flights || []
      if (!legs.length) return null
      const first = legs[0], last = legs[legs.length - 1]
      return {
        id: crypto.randomUUID(),
        airline: [...new Set(legs.map((l: any) => l.airline))].join(' · '),
        from: `${first.departure_airport.name} (${first.departure_airport.id})`,
        to: `${last.arrival_airport.name} (${last.arrival_airport.id})`,
        departureTime: first.departure_airport.time,
        arrivalTime: last.arrival_airport.time,
        durationMinutes: o.total_duration,
        price: Number(o.price),
        stops: Math.max(0, legs.length - 1),
        source: 'serp',
      }
    }).filter(Boolean)
    return res.json(rows)
  } catch (e) {
    clearTimeout(timer)
    if (e instanceof Error && e.name === 'AbortError') {
      return res.status(504).json({ error: 'SerpAPI timed out' })
    }
    return res.status(500).json({ error: 'SerpAPI fetch failed' })
  }
}
