import type { Request, Response } from 'express'
import { prisma } from '../db.js'
import {
  fetchGoogleFlightsFromSerp,
  type SerpSearchParams,
} from '../services/serpApiFlights.js'
import {
  EXPLORE_EXTRA_PARAM_KEYS,
  fetchGoogleTravelExplore,
  normalizeSerpLocationIds,
  type ExploreSearchParams,
} from '../services/serpApiTravelExplore.js'
import { AppError } from '../utils/AppError.js'

const OPTIONAL_SERP_QUERY_KEYS = [
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
] as const

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** Pulls documented SerpAPI options from the query string (allowlisted). */
function serpOptionsFromQuery(req: Request): Partial<SerpSearchParams> {
  const out: Record<string, string> = {}
  for (const key of OPTIONAL_SERP_QUERY_KEYS) {
    const raw = req.query[key]
    if (typeof raw !== 'string') continue
    let v = raw.trim()
    if (!v) continue

    if (key === 'multi_city_json') {
      if (v.length > 12000) continue
    } else if (v.length > 128) continue

    if (key === 'return_date' && !isIsoDate(v)) continue
    if (key === 'deep_search' || key === 'show_hidden' || key === 'no_cache') {
      const low = v.toLowerCase()
      if (low !== 'true' && low !== 'false') continue
      v = low
    }
    if (key === 'hl' || key === 'gl') {
      if (!/^[a-z]{2}$/i.test(v)) continue
      v = v.toLowerCase()
    }

    out[key] = v
  }
  return out as Partial<SerpSearchParams>
}

/** Allowlisted Google Travel Explore extras (see SerpAPI docs). */
function exploreExtrasFromQuery(req: Request): Partial<ExploreSearchParams> {
  const out: Record<string, string> = {}
  for (const key of EXPLORE_EXTRA_PARAM_KEYS) {
    const raw = req.query[key]
    if (typeof raw !== 'string') continue
    let v = raw.trim()
    if (!v) continue

    if (key === 'multi_city_json') {
      if (v.length > 12000) continue
    } else if (key === 'include_airlines' || key === 'exclude_airlines') {
      if (v.length > 256) continue
    } else if (v.length > 128) continue

    if (key === 'outbound_date' || key === 'return_date') {
      if (!isIsoDate(v)) continue
    }
    if (key === 'no_cache') {
      const low = v.toLowerCase()
      if (low !== 'true' && low !== 'false') continue
      v = low
    }
    if (key === 'interest' && !/^\/[mg]\/[\w-]+$/.test(v)) continue
    if (key === 'arrival_area_id' && !v.startsWith('/m/')) continue
    if (key === 'month' && !/^(0|[1-9]|1[0-2])$/.test(v)) continue
    if (key === 'travel_duration' && !/^[1-3]$/.test(v)) continue
    if (key === 'travel_mode' && !/^[01]$/.test(v)) continue
    if (key === 'type' && !/^[123]$/.test(v)) continue

    out[key] = v
  }
  return out as Partial<ExploreSearchParams>
}

function dayBoundsUTC(isoDate: string): { start: Date; end: Date } | null {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
  if (Number.isNaN(start.getTime())) return null
  return { start, end }
}

export async function listFlights(req: Request, res: Response): Promise<void> {
  const from = typeof req.query.from === 'string' ? req.query.from.trim() : ''
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : ''
  const date = typeof req.query.date === 'string' ? req.query.date.trim() : ''

  if (!from || !to) {
    throw new AppError('Query parameters "from" and "to" are required.', 400)
  }
  if (!date) {
    throw new AppError('Query parameter "date" is required (YYYY-MM-DD).', 400)
  }

  const bounds = dayBoundsUTC(date)
  if (!bounds) {
    throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400)
  }

  const flights = await prisma.flight.findMany({
    where: {
      AND: [
        { from: { contains: from, mode: 'insensitive' } },
        { to: { contains: to, mode: 'insensitive' } },
        {
          departureTime: {
            gte: bounds.start,
            lte: bounds.end,
          },
        },
      ],
    },
    orderBy: { departureTime: 'asc' },
    take: 500,
  })

  res.json(
    flights.map((f) => ({
      ...f,
      price: Number(f.price),
    }))
  )
}

/**
 * Live Google Flights via SerpAPI (IATA codes). Same response shape as GET /flights for the UI.
 * @see https://serpapi.com/google-flights-api
 */
export async function listSerpFlights(req: Request, res: Response): Promise<void> {
  const departure_id = typeof req.query.departure_id === 'string' ? req.query.departure_id.trim() : ''
  const arrival_id = typeof req.query.arrival_id === 'string' ? req.query.arrival_id.trim() : ''
  const outbound_date =
    typeof req.query.outbound_date === 'string'
      ? req.query.outbound_date.trim()
      : typeof req.query.date === 'string'
        ? req.query.date.trim()
        : ''

  if (!departure_id || !arrival_id) {
    throw new AppError('Query parameters departure_id and arrival_id (IATA codes) are required.', 400)
  }
  if (!outbound_date) {
    throw new AppError('Query parameter outbound_date (or date) is required (YYYY-MM-DD).', 400)
  }

  const currency =
    typeof req.query.currency === 'string' && req.query.currency.trim()
      ? req.query.currency.trim()
      : 'USD'
  const type =
    typeof req.query.type === 'string' && req.query.type.trim()
      ? req.query.type.trim()
      : '2'

  const flights = await fetchGoogleFlightsFromSerp({
    departure_id,
    arrival_id,
    outbound_date,
    currency,
    type,
    ...serpOptionsFromQuery(req),
  })

  res.json(flights)
}

/**
 * Google Travel Explore via SerpAPI — `departure_id` as IATA or `/m/…` kgmid (e.g. NYC `/m/02_286`).
 * Optional `arrival_id` narrows to a destination (e.g. LA `/m/030qb3t`).
 * @see https://serpapi.com/google-travel-explore-api
 */
export async function listSerpTravelExplore(req: Request, res: Response): Promise<void> {
  const departure_id = typeof req.query.departure_id === 'string' ? req.query.departure_id.trim() : ''
  if (!departure_id) {
    throw new AppError(
      'Query parameter departure_id is required (IATA code(s), comma-separated, or /m/… location id).',
      400
    )
  }
  if (departure_id.length > 512) {
    throw new AppError('departure_id is too long.', 400)
  }

  const arrival_id = typeof req.query.arrival_id === 'string' ? req.query.arrival_id.trim() : ''
  if (arrival_id.length > 512) {
    throw new AppError('arrival_id is too long.', 400)
  }

  const currency =
    typeof req.query.currency === 'string' && req.query.currency.trim()
      ? req.query.currency.trim()
      : 'USD'
  const glRaw =
    typeof req.query.gl === 'string' && req.query.gl.trim() ? req.query.gl.trim().toLowerCase() : 'us'
  const hlRaw =
    typeof req.query.hl === 'string' && req.query.hl.trim() ? req.query.hl.trim().toLowerCase() : 'en'

  if (!/^[a-z]{2}$/.test(glRaw)) {
    throw new AppError('Invalid gl (two-letter country code, e.g. us).', 400)
  }
  if (!/^[a-z]{2}$/.test(hlRaw)) {
    throw new AppError('Invalid hl (two-letter language code, e.g. en).', 400)
  }

  const payload = await fetchGoogleTravelExplore({
    departure_id: normalizeSerpLocationIds(departure_id),
    currency,
    gl: glRaw,
    hl: hlRaw,
    ...(arrival_id ? { arrival_id: normalizeSerpLocationIds(arrival_id) } : {}),
    ...exploreExtrasFromQuery(req),
  })

  res.json(payload)
}
