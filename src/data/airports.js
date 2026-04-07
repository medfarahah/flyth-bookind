import { WORLD_AIRPORTS } from './worldAirports.js'

/** All airports available in search (same catalog as DB seed). */
export const AIRPORTS = WORLD_AIRPORTS.map(({ code, label }) => ({ code, label }))

export function airportLabel(code) {
  if (!code || typeof code !== 'string') return ''
  const c = code.trim().toUpperCase()
  return AIRPORTS.find((a) => a.code === c)?.label ?? code.trim()
}
