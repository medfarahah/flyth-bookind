import { randomUUID } from 'node:crypto'
import { AppError } from '../utils/AppError.js'

const SERP_BASE = 'https://serpapi.com/search.json'

type SerpLeg = {
  departure_airport: { name: string; id: string; time: string }
  arrival_airport: { name: string; id: string; time: string }
  duration: number
  airline: string
  flight_number?: string
}

type SerpOffer = {
  flights: SerpLeg[]
  total_duration: number
  price: number
}

function parseSerpDateTime(s: string): Date {
  const normalized = s.includes('T') ? s : s.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) throw new Error(`Bad datetime: ${s}`)
  return d
}

function normalizeOffer(offer: SerpOffer) {
  const legs = offer.flights
  if (!legs?.length) return null

  const first = legs[0]
  const last = legs[legs.length - 1]
  const dep = first.departure_airport
  const arr = last.arrival_airport

  const fromLabel = `${dep.name} (${dep.id})`
  const toLabel = `${arr.name} (${arr.id})`

  const primaryAirline = [...new Set(legs.map((l) => l.airline))].join(' · ')
  const legNumbers = legs.map((l) => l.flight_number).filter(Boolean) as string[]

  return {
    id: randomUUID(),
    airline: primaryAirline,
    from: fromLabel,
    to: toLabel,
    departureTime: parseSerpDateTime(dep.time),
    arrivalTime: parseSerpDateTime(arr.time),
    /** SerpAPI total trip time including layovers (minutes) — prefer over wall-clock delta (timezones). */
    durationMinutes: typeof offer.total_duration === 'number' ? offer.total_duration : undefined,
    price: offer.price,
    stops: Math.max(0, legs.length - 1),
    source: 'serp' as const,
    ...(legNumbers.length ? { flightNumber: legNumbers.join(' → ') } : {}),
  }
}

/** Optional params aligned with https://serpapi.com/google-flights-api */
export type SerpSearchParams = {
  departure_id: string
  arrival_id: string
  outbound_date: string
  currency?: string
  /** 1 round trip, 2 one-way (default), 3 multi-city */
  type?: string
  return_date?: string
  hl?: string
  gl?: string
  /** "true" / "false" — slower, closer to browser Google Flights */
  deep_search?: string
  show_hidden?: string
  adults?: string
  children?: string
  infants_in_seat?: string
  infants_on_lap?: string
  /** 1 top flights … 6 emissions */
  sort_by?: string
  /** 0 any, 1 nonstop, 2 ≤1 stop, 3 ≤2 stops */
  stops?: string
  /** 1 economy … 4 first */
  travel_class?: string
  max_price?: string
  bags?: string
  outbound_times?: string
  no_cache?: string
  multi_city_json?: string
}

const OPTIONAL_SERP_KEYS: (keyof SerpSearchParams)[] = [
  'currency',
  'type',
  'return_date',
  'hl',
  'gl',
  'deep_search',
  'show_hidden',
  'adults',
  'children',
  'infants_in_seat',
  'infants_on_lap',
  'sort_by',
  'stops',
  'travel_class',
  'max_price',
  'bags',
  'outbound_times',
  'no_cache',
  'multi_city_json',
]

/**
 * Calls SerpAPI Google Flights engine. Requires SERPAPI_API_KEY.
 * @see https://serpapi.com/google-flights-api
 */
export async function fetchGoogleFlightsFromSerp(params: SerpSearchParams) {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    throw new AppError('SerpAPI is not configured (set SERPAPI_API_KEY).', 503)
  }

  const url = new URL(SERP_BASE)
  url.searchParams.set('engine', 'google_flights')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('departure_id', params.departure_id.trim().toUpperCase())
  url.searchParams.set('arrival_id', params.arrival_id.trim().toUpperCase())
  url.searchParams.set('outbound_date', params.outbound_date.trim())
  url.searchParams.set('currency', (params.currency ?? 'USD').trim())
  url.searchParams.set('type', params.type ?? '2')

  for (const key of OPTIONAL_SERP_KEYS) {
    const v = params[key]
    if (v === undefined || v === '') continue
    url.searchParams.set(key, String(v).trim())
  }

  /** Fail before Vercel Hobby ~10s wall clock; leaves room for Prisma + JSON work. */
  const SERP_TIMEOUT_MS = Number(process.env.SERPAPI_FETCH_TIMEOUT_MS) || 8000
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), SERP_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url.toString(), { signal: ac.signal })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AppError(`SerpAPI request timed out after ${SERP_TIMEOUT_MS}ms`, 504)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new AppError(`SerpAPI HTTP ${res.status}`, 502)
  }

  const data = (await res.json()) as {
    error?: string
    best_flights?: SerpOffer[]
    other_flights?: SerpOffer[]
  }

  if (data.error) {
    throw new AppError(data.error, 502)
  }

  const buckets = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
  const rows = buckets
    .map((o) => normalizeOffer(o))
    .filter((x): x is NonNullable<typeof x> => x != null)

  return rows.map((r) => ({
    ...r,
    price: Number(r.price),
  }))
}
