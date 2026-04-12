import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_cors.js'

export const config = { maxDuration: 15 }

const SERP_BASE = 'https://serpapi.com/search.json'

function normIds(raw: string): string {
  return raw.split(',').map(t => {
    const s = t.trim()
    if (s.startsWith('/m/') || s.startsWith('/g/')) return s
    if (/^[a-z]{3}$/i.test(s)) return s.toUpperCase()
    return s
  }).filter(Boolean).join(',')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'SerpAPI not configured.' })

  const departure_id = typeof req.query.departure_id === 'string' ? req.query.departure_id.trim() : ''
  if (!departure_id) return res.status(400).json({ error: 'departure_id is required.' })

  const url = new URL(SERP_BASE)
  url.searchParams.set('engine', 'google_travel_explore')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('departure_id', normIds(departure_id))

  const passthrough: Record<string, string> = {}
  for (const key of ['arrival_id', 'currency', 'gl', 'hl', 'type', 'outbound_date', 'return_date', 'month', 'stops', 'travel_class', 'adults', 'no_cache'] as const) {
    const v = typeof req.query[key] === 'string' ? req.query[key].trim() : ''
    if (v) passthrough[key] = v
  }
  if (!passthrough.currency) passthrough.currency = 'USD'
  if (!passthrough.gl) passthrough.gl = 'us'
  if (!passthrough.hl) passthrough.hl = 'en'
  if (passthrough.arrival_id) passthrough.arrival_id = normIds(passthrough.arrival_id)

  for (const [k, v] of Object.entries(passthrough)) url.searchParams.set(k, v)

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8000)
  try {
    const serpRes = await fetch(url.toString(), { signal: ac.signal })
    clearTimeout(timer)
    if (!serpRes.ok) return res.status(502).json({ error: `SerpAPI HTTP ${serpRes.status}` })
    const data = await serpRes.json() as Record<string, unknown>
    if (data.error) return res.status(502).json({ error: data.error })

    return res.json({
      source: 'serp_explore',
      destinations: data.destinations ?? null,
      flights: data.flights ?? null,
      startDate: data.start_date ?? null,
      endDate: data.end_date ?? null,
      googleFlightsLink: data.google_flights_link ?? null,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e instanceof Error && e.name === 'AbortError') {
      return res.status(504).json({ error: 'SerpAPI timed out' })
    }
    return res.status(500).json({ error: 'SerpAPI fetch failed' })
  }
}
