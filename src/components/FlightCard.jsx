import { useNavigate } from 'react-router-dom'
import { formatDuration, formatTime, stopsLabel } from '../utils/flightFormat'

export function FlightCard({ flight, search }) {
  const navigate = useNavigate()

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
            {flight.airline}
          </p>
          <p className="text-sm text-slate-500">{flight.flightNumber}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-blue-600">
          ${flight.price}
          <span className="text-sm font-normal text-slate-500"> USD</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {flight.from.code}
          </p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {formatTime(flight.departure)}
          </p>
          <p className="truncate text-sm text-slate-500">{flight.from.city}</p>
        </div>

        <div className="flex flex-1 flex-col items-center px-2">
          <p className="text-xs text-slate-500">{formatDuration(flight.durationMinutes)}</p>
          <div className="my-1 flex w-full items-center gap-1">
            <span className="h-px flex-1 bg-slate-300" />
            <svg
              className="h-4 w-4 shrink-0 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="h-px flex-1 bg-slate-300" />
          </div>
          <p className="text-xs font-medium text-slate-600">{stopsLabel(flight.stops)}</p>
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {flight.to.code}
          </p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {formatTime(flight.arrival)}
          </p>
          <p className="truncate text-sm text-slate-500">{flight.to.city}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {flight.source === 'serp' ? (
          <p className="text-right text-sm text-amber-800">
            Live Google Flights fare (SerpAPI) — booking uses database flights only. Search by city name to book
            seeded routes, or use IATA codes to compare live prices.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/booking', { state: { flight, search } })}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
          >
            Select flight
          </button>
        )}
      </div>
    </article>
  )
}
