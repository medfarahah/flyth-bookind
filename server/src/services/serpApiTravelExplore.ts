import { AppError } from '../utils/AppError.js'

const SERP_BASE = 'https://serpapi.com/search.json'

/** Normalize comma-separated IATA codes to uppercase; keep `/m/…` and `/g/…` ids as-is. */
export function normalizeSerpLocationIds(raw: string): string {
  return raw
    .split(',')
    .map((part) => {
      const t = part.trim()
      if (!t) return ''
      if (t.startsWith('/m/') || t.startsWith('/g/')) return t
      if (/^[a-z]{3}$/i.test(t)) return t.toUpperCase()
      return t
    })
    .filter(Boolean)
    .join(',')
}

export type ExploreSearchParams = {
  departure_id: string
  arrival_id?: string
  currency?: string
  gl?: string
  hl?: string
  type?: string
  outbound_date?: string
  return_date?: string
  month?: string
  travel_duration?: string
  travel_class?: string
  adults?: string
  children?: string
  infants_in_seat?: string
  infants_on_lap?: string
  stops?: string
  travel_mode?: string
  interest?: string
  include_airlines?: string
  exclude_airlines?: string
  bags?: string
  max_price?: string
  max_duration?: string
  no_cache?: string
  multi_city_json?: string
  arrival_area_id?: string
}

/** Query keys forwarded to SerpAPI after departure/arrival/currency/gl/hl. */
export const EXPLORE_EXTRA_PARAM_KEYS: (keyof ExploreSearchParams)[] = [
  'arrival_area_id',
  'type',
  'outbound_date',
  'return_date',
  'month',
  'travel_duration',
  'travel_class',
  'adults',
  'children',
  'infants_in_seat',
  'infants_on_lap',
  'stops',
  'travel_mode',
  'interest',
  'include_airlines',
  'exclude_airlines',
  'bags',
  'max_price',
  'max_duration',
  'no_cache',
  'multi_city_json',
]

type SerpExploreResponse = {
  error?: string
  destinations?: unknown[]
  flights?: unknown[]
  start_date?: string
  end_date?: string
  google_flights_link?: string
  google_flights_serpapi_link?: string
}

/**
 * Google Travel Explore — destinations or route options from a departure (IATA or `/m/…` kgmid).
 * @see https://serpapi.com/google-travel-explore-api
 */
export async function fetchGoogleTravelExplore(
  params: ExploreSearchParams
): Promise<{
  source: 'serp_explore'
  destinations: unknown[] | null
  flights: unknown[] | null
  startDate: string | null
  endDate: string | null
  googleFlightsLink: string | null
  googleFlightsSerpapiLink: string | null
}> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    throw new AppError('SerpAPI is not configured (set SERPAPI_API_KEY).', 503)
  }

  const url = new URL(SERP_BASE)
  url.searchParams.set('engine', 'google_travel_explore')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('departure_id', normalizeSerpLocationIds(params.departure_id))

  const currency = (params.currency && params.currency.trim()) || 'USD'
  const gl = ((params.gl && params.gl.trim()) || 'us').toLowerCase()
  const hl = ((params.hl && params.hl.trim()) || 'en').toLowerCase()
  url.searchParams.set('currency', currency)
  url.searchParams.set('gl', gl)
  url.searchParams.set('hl', hl)

  if (params.arrival_id?.trim()) {
    url.searchParams.set('arrival_id', normalizeSerpLocationIds(params.arrival_id.trim()))
  }

  for (const key of EXPLORE_EXTRA_PARAM_KEYS) {
    const v = params[key]
    if (v === undefined || v === '') continue
    let s = String(v).trim()
    if (!s) continue
    if (key === 'multi_city_json') {
      if (s.length > 12000) continue
    } else if (key === 'include_airlines' || key === 'exclude_airlines') {
      if (s.length > 256) continue
    } else if (s.length > 128) continue

    if (key === 'arrival_area_id') {
      s = normalizeSerpLocationIds(s)
    }
    url.searchParams.set(key, s)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new AppError(`SerpAPI HTTP ${res.status}`, 502)
  }

  const data = (await res.json()) as SerpExploreResponse
  if (data.error) {
    throw new AppError(data.error, 502)
  }

  return {
    source: 'serp_explore',
    destinations: data.destinations ?? null,
    flights: data.flights ?? null,
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    googleFlightsLink: data.google_flights_link ?? null,
    googleFlightsSerpapiLink: data.google_flights_serpapi_link ?? null,
  }
}
