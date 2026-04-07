import { prisma } from '../src/db.js'
import { WORLD_AIRPORTS } from '../../src/data/worldAirports.js'

const AIRLINES = [
  'Delta Air Lines',
  'United Airlines',
  'American Airlines',
  'JetBlue',
  'Southwest Airlines',
  'Alaska Airlines',
  'Air Canada',
  'British Airways',
  'Air France',
  'Lufthansa',
  'KLM',
  'Iberia',
  'ITA Airways',
  'TAP Air Portugal',
  'Scandinavian Airlines',
  'Finnair',
  'Emirates',
  'Qatar Airways',
  'Etihad Airways',
  'Singapore Airlines',
  'Cathay Pacific',
  'Japan Airlines',
  'ANA',
  'Korean Air',
  'Qantas',
  'Air New Zealand',
  'LATAM Airlines',
  'Copa Airlines',
  'Avianca',
  'Ethiopian Airlines',
  'Turkish Airlines',
  'China Southern Airlines',
  'Air China',
  'Ryanair',
  'easyJet',
  'Norwegian Air',
  'Virgin Atlantic',
  'Aeromexico',
  'WestJet',
  'Frontier Airlines',
  'Spirit Airlines',
]

/** Deterministic PRNG for reproducible seeds. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function routeKind(
  r1: string,
  r2: string
): 'short' | 'medium' | 'long' {
  if (r1 === r2) return 'short'
  if (r1 === 'OC' || r2 === 'OC') return 'long'
  if (r1 === 'AF' || r2 === 'AF' || r1 === 'SA' || r2 === 'SA') return 'long'
  if ((r1 === 'NA' && r2 === 'EU') || (r1 === 'EU' && r2 === 'NA')) return 'long'
  if (
    (r1 === 'NA' && (r2 === 'AS' || r2 === 'ME')) ||
    (r2 === 'NA' && (r1 === 'AS' || r1 === 'ME'))
  ) {
    return 'long'
  }
  if ((r1 === 'EU' && r2 === 'AS') || (r1 === 'AS' && r2 === 'EU')) return 'medium'
  if (
    (r1 === 'NA' && r2 === 'OC') ||
    (r2 === 'NA' && r1 === 'OC') ||
    (r1 === 'EU' && r2 === 'OC') ||
    (r2 === 'EU' && r1 === 'OC') ||
    (r1 === 'AS' && r2 === 'OC') ||
    (r2 === 'AS' && r1 === 'OC')
  ) {
    return 'long'
  }
  if ((r1 === 'ME' && r2 === 'AS') || (r1 === 'AS' && r2 === 'ME')) return 'medium'
  if (r1 === 'ME' || r2 === 'ME') return 'long'
  return 'medium'
}

function durationMinutes(kind: 'short' | 'medium' | 'long', rng: () => number): number {
  if (kind === 'short') return Math.floor(75 + rng() * 145)
  if (kind === 'medium') return Math.floor(180 + rng() * 300)
  return Math.floor(360 + rng() * 480)
}

function stopsFor(kind: 'short' | 'medium' | 'long', rng: () => number): number {
  const x = rng()
  if (kind === 'short') return x < 0.72 ? 0 : 1
  if (kind === 'medium') return x < 0.55 ? 0 : x < 0.92 ? 1 : 2
  return x < 0.35 ? 0 : x < 0.78 ? 1 : 2
}

function priceFor(kind: 'short' | 'medium' | 'long', rng: () => number): number {
  if (kind === 'short') return Math.floor(79 + rng() * 420)
  if (kind === 'medium') return Math.floor(140 + rng() * 860)
  return Math.floor(320 + rng() * 2100)
}

/** Inclusive UTC range: 1 Apr 2026 → 30 Jun 2026. */
const RANGE_START_MS = Date.UTC(2026, 3, 1)
const RANGE_END_MS = Date.UTC(2026, 5, 30)

const INSERT_BATCH = 4000

type FlightRow = {
  airline: string
  from: string
  to: string
  departureTime: Date
  arrivalTime: Date
  price: number
  stops: number
}

async function main() {
  await prisma.booking.deleteMany()
  await prisma.flight.deleteMany()

  const ap = WORLD_AIRPORTS
  const n = ap.length
  const pairsPerDay = n * (n - 1)

  let total = 0
  let dayIndex = 0

  for (let ms = RANGE_START_MS; ms <= RANGE_END_MS; ms += 86400000) {
    const dayFlights: FlightRow[] = []
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const mo = d.getUTCMonth()
    const dayNum = d.getUTCDate()

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const a = ap[i]
        const b = ap[j]
        const kind = routeKind(a.region, b.region)
        const seed =
          ((dayIndex * 100003 + i * 1009 + j * 9176) ^ (dayIndex << 16)) >>> 0
        const rng = mulberry32(seed)
        const depHour = 5 + Math.floor(rng() * 17)
        const depMin = Math.floor(rng() * 60)
        const dep = new Date(Date.UTC(y, mo, dayNum, depHour, depMin, 0))
        const dur = durationMinutes(kind, rng)
        const arr = new Date(dep.getTime() + dur * 60 * 1000)
        const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)]
        dayFlights.push({
          airline,
          from: a.label,
          to: b.label,
          departureTime: dep,
          arrivalTime: arr,
          price: priceFor(kind, rng),
          stops: stopsFor(kind, rng),
        })
      }
    }

    for (let k = 0; k < dayFlights.length; k += INSERT_BATCH) {
      await prisma.flight.createMany({
        data: dayFlights.slice(k, k + INSERT_BATCH),
      })
    }

    total += dayFlights.length
    dayIndex++
    if (dayIndex % 10 === 0) {
      console.log(`  … ${dayIndex} days inserted (${total} flights so far)`)
    }
  }

  const days =
    Math.round((RANGE_END_MS - RANGE_START_MS) / 86400000) + 1
  console.log(
    `Seeded ${n} airports, ${total} flights: every ordered pair (≠ same airport) on each of ${days} days (Apr 1–Jun 30 2026 UTC), ${pairsPerDay} flights/day.`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    void prisma.$disconnect()
    process.exit(1)
  })
