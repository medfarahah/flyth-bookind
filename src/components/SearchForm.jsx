import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AIRPORTS } from '../data/airports.js'

const passengerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const selectClassName =
  'w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 pr-10 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'

function todayISODate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function SearchForm() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [departureDate, setDepartureDate] = useState(todayISODate())
  const [returnDate, setReturnDate] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const next = {}
    const f = from.trim()
    const t = to.trim()

    if (!f) next.from = 'Choose an airport'
    if (!t) next.to = 'Choose an airport'
    if (f && t && f.toLowerCase() === t.toLowerCase()) {
      next.to = 'Destination must differ from origin'
    }
    if (!departureDate) next.departureDate = 'Choose a departure date'

    if (departureDate && returnDate && returnDate < departureDate) {
      next.returnDate = 'Return must be on or after departure'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSwap = () => {
    setFrom(to)
    setTo(from)
    setErrors({})
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    navigate('/results', {
      state: {
        search: {
          from: from.trim(),
          to: to.trim(),
          departureDate,
          returnDate: returnDate || null,
          passengers,
        },
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/5 sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Where to?</h2>
          <p className="text-sm text-slate-500">
            Pick origin and destination from the list. IATA codes are sent to the server — seeded routes match
            these airports; with SerpAPI configured, live Google Flights are merged too.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSwap}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 active:scale-[0.98] sm:self-auto"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6.99 11L3 15l3.99 4v-3H17v-2H6.99v-3zM21 9l-3.99-4v3H7v2h10.01v3L21 9z" />
          </svg>
          Swap
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-left">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
          </span>
          <div className="relative">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={selectClassName}
              aria-invalid={errors.from ? 'true' : 'false'}
            >
              <option value="">Select airport</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              ▼
            </span>
          </div>
          {errors.from && (
            <span className="mt-1 block text-sm text-red-600">{errors.from}</span>
          )}
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
          </span>
          <div className="relative">
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={selectClassName}
              aria-invalid={errors.to ? 'true' : 'false'}
            >
              <option value="">Select airport</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              ▼
            </span>
          </div>
          {errors.to && <span className="mt-1 block text-sm text-red-600">{errors.to}</span>}
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Departure
          </span>
          <input
            type="date"
            value={departureDate}
            min={todayISODate()}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.departureDate && (
            <span className="mt-1 block text-sm text-red-600">{errors.departureDate}</span>
          )}
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Return <span className="font-normal normal-case text-slate-400">(optional)</span>
          </span>
          <input
            type="date"
            value={returnDate}
            min={departureDate || todayISODate()}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.returnDate && (
            <span className="mt-1 block text-sm text-red-600">{errors.returnDate}</span>
          )}
        </label>

        <label className="block text-left sm:col-span-2 md:col-span-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Passengers
          </span>
          <div className="relative">
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 pr-10 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {passengerOptions.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'passenger' : 'passengers'}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              ▼
            </span>
          </div>
        </label>
      </div>

      <button
        type="submit"
        className="mt-8 w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl active:scale-[0.99] sm:mt-10"
      >
        Search flights
      </button>
    </form>
  )
}
