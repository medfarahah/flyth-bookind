import { getJson, ApiError } from './client.js'
import { API } from './endpoints.js'
import { mapApiFlight } from './normalizeFlight.js'

/**
 * Ensures we always map a flight array; explains HTML/error objects from bad routes or proxies.
 */
function normalizeFlightArray(data, label) {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object') {
    const err = data.error
    if (typeof err === 'string') {
      const t = err.trim()
      if (t.startsWith('<!DOCTYPE') || t.toLowerCase().startsWith('<html')) {
        throw new ApiError(
          `${label}: got a web page instead of JSON. Start the API (e.g. npm run dev:full) or check VITE_API_URL / deployment.`,
          502
        )
      }
      if (t) throw new ApiError(t, 500)
    }
  }
  throw new ApiError(
    `${label}: expected a JSON array; got ${data === null ? 'empty body' : typeof data}.`,
    500
  )
}

/**
 * GET /flights?from=&to=&date=YYYY-MM-DD
 */
export async function fetchFlights({ from, to, departureDate }) {
  const params = new URLSearchParams({
    from: from.trim(),
    to: to.trim(),
    date: departureDate,
  })
  const data = await getJson(API.flights.search(params.toString()))
  const rows = normalizeFlightArray(data, 'Database flights')
  return rows.map(mapApiFlight)
}

const SERP_OPTIONAL_KEYS = [
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
 * GET /flights/serp?departure_id=&arrival_id=&outbound_date=&currency=&type=&…
 * Optional SerpAPI params: deep_search, hl, gl, return_date (round trip), etc.
 * Requires SERPAPI_API_KEY on the server.
 */
export async function fetchSerpFlights({
  departure_id,
  arrival_id,
  outbound_date,
  currency = 'USD',
  type = '2',
  ...rest
}) {
  const params = new URLSearchParams({
    departure_id: departure_id.trim().toUpperCase(),
    arrival_id: arrival_id.trim().toUpperCase(),
    outbound_date: outbound_date.trim(),
    currency: String(currency).trim() || 'USD',
    type: String(type),
  })
  for (const key of SERP_OPTIONAL_KEYS) {
    const v = rest[key]
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (s) params.set(key, s)
  }
  const data = await getJson(API.flights.serp(params.toString()))
  const rows = normalizeFlightArray(data, 'Live flights (SerpAPI)')
  return rows.map(mapApiFlight)
}

const EXPLORE_EXTRA_KEYS = [
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

/**
 * GET /flights/explore?departure_id=&arrival_id=&currency=&gl=&hl=&…
 * SerpAPI `google_travel_explore` — kgmid example: departure_id `/m/02_286`, arrival_id `/m/030qb3t`.
 */
export async function fetchTravelExplore({
  departure_id,
  arrival_id,
  currency = 'USD',
  gl = 'us',
  hl = 'en',
  ...rest
}) {
  if (!departure_id?.trim()) {
    throw new ApiError('departure_id is required', 400)
  }
  const cur = String(currency).trim() || 'USD'
  const glVal = String(gl).trim().toLowerCase() || 'us'
  const hlVal = String(hl).trim().toLowerCase() || 'en'
  const params = new URLSearchParams({
    departure_id: departure_id.trim(),
    currency: cur,
    gl: glVal,
    hl: hlVal,
  })
  if (arrival_id?.trim()) {
    params.set('arrival_id', arrival_id.trim())
  }
  for (const key of EXPLORE_EXTRA_KEYS) {
    const v = rest[key]
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (s) params.set(key, s)
  }
  return getJson(API.flights.explore(params.toString()))
}
