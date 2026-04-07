function parsePlace(s) {
  const m = String(s).match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (m) return { city: m[1].trim(), code: m[2].trim() }
  const t = String(s).trim()
  if (t.length <= 4) return { city: t, code: t.toUpperCase() }
  return { city: t, code: t.slice(0, 3).toUpperCase() }
}

export function mapApiFlight(api) {
  const departure = api.departureTime
  const arrival = api.arrivalTime
  const fromWallClock = Math.max(
    0,
    Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60000)
  )
  const durationMinutes =
    typeof api.durationMinutes === 'number' && Number.isFinite(api.durationMinutes) && api.durationMinutes > 0
      ? Math.round(api.durationMinutes)
      : fromWallClock

  const flightNumber =
    typeof api.flightNumber === 'string' && api.flightNumber.trim()
      ? api.flightNumber.trim()
      : `FL ${String(api.id).slice(0, 8)}`

  return {
    id: api.id,
    airline: api.airline,
    flightNumber,
    from: parsePlace(api.from),
    to: parsePlace(api.to),
    departure,
    arrival,
    durationMinutes,
    stops: typeof api.stops === 'number' ? api.stops : 0,
    price: Number(api.price),
    currency: 'USD',
    ...(api.source ? { source: api.source } : {}),
  }
}
