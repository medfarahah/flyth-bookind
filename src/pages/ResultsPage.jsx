import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchFlights, fetchSerpFlights } from '../api/flightsApi'
import { ApiError } from '../api/client.js'
import { FilterSidebar } from '../components/FilterSidebar'
import { FlightCard } from '../components/FlightCard'
import { ResultsSkeletonList } from '../components/FlightCardSkeleton'
import { airportLabel } from '../data/airports.js'

function applyFilters(flights, { priceRange, stopsFilter, airlineEnabled }) {
  return flights.filter((f) => {
    if (f.price < priceRange[0] || f.price > priceRange[1]) return false
    if (stopsFilter === 0 && f.stops !== 0) return false
    if (stopsFilter === 1 && f.stops !== 1) return false
    if (stopsFilter === 2 && f.stops < 2) return false
    if (!airlineEnabled[f.airline]) return false
    return true
  })
}

function sortFlights(flights, sort) {
  const copy = [...flights]
  if (sort === 'cheapest') copy.sort((a, b) => a.price - b.price)
  if (sort === 'fastest') copy.sort((a, b) => a.durationMinutes - b.durationMinutes)
  return copy
}

export function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const search = location.state?.search

  const [rawFlights, setRawFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('cheapest')
  const [stopsFilter, setStopsFilter] = useState('any')
  const [priceRange, setPriceRange] = useState([0, 2000])
  const [priceBounds, setPriceBounds] = useState([0, 2000])
  const [airlineEnabled, setAirlineEnabled] = useState({})
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    if (!search?.from || !search?.to) {
      navigate('/', { replace: true })
      return
    }

    let cancelled = false

    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const fromCode = search.from.trim().toUpperCase()
        const toCode = search.to.trim().toUpperCase()
        const iataPair = /^[A-Z]{3}$/.test(fromCode) && /^[A-Z]{3}$/.test(toCode)

        const dbPromise = fetchFlights({
          from: search.from,
          to: search.to,
          departureDate: search.departureDate,
        })

        const serpPromise = iataPair
          ? fetchSerpFlights({
              departure_id: fromCode,
              arrival_id: toCode,
              outbound_date: search.departureDate,
            }).catch(() => [])
          : Promise.resolve([])

        const [dbRows, serpRows] = await Promise.all([dbPromise, serpPromise])
        if (cancelled) return

        const seen = new Set()
        const merged = []
        for (const f of [...serpRows, ...dbRows]) {
          if (seen.has(f.id)) continue
          seen.add(f.id)
          merged.push(f)
        }

        const data = merged
        setRawFlights(data)
        if (data.length) {
          const prices = data.map((f) => f.price)
          const minP = Math.min(...prices)
          const maxP = Math.max(...prices)
          setPriceBounds([minP, maxP])
          setPriceRange([minP, maxP])
          const next = {}
          for (const f of data) next[f.airline] = true
          setAirlineEnabled(next)
        } else {
          setPriceBounds([0, 0])
          setPriceRange([0, 0])
          setAirlineEnabled({})
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search, navigate])

  const filtered = useMemo(
    () => applyFilters(rawFlights, { priceRange, stopsFilter, airlineEnabled }),
    [rawFlights, priceRange, stopsFilter, airlineEnabled]
  )

  const visible = useMemo(() => sortFlights(filtered, sort), [filtered, sort])

  const resetFilters = () => {
    if (!rawFlights.length) return
    const prices = rawFlights.map((f) => f.price)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    setPriceRange([minP, maxP])
    setStopsFilter('any')
    const next = {}
    for (const f of rawFlights) next[f.airline] = true
    setAirlineEnabled(next)
    setSort('cheapest')
  }

  const toggleAirline = (name) => {
    setAirlineEnabled((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  if (!search) return null

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50/80">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm text-slate-500">Results for</p>
            <p className="text-lg font-semibold text-slate-900">
              {airportLabel(search.from)} → {airportLabel(search.to)}
            </p>
            <p className="text-sm text-slate-500">
              Depart {search.departureDate}
              {search.returnDate ? ` · Return ${search.returnDate}` : ''} · {search.passengers}{' '}
              {search.passengers === 1 ? 'passenger' : 'passengers'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
            >
              Edit search
            </Link>
            <button
              type="button"
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 transition-all duration-200 hover:bg-blue-100 md:hidden"
              onClick={() => setMobileFiltersOpen((o) => !o)}
            >
              {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {!loading && !error && (
              <>
                <span className="font-semibold text-slate-900">{visible.length}</span> flights
                {visible.length !== rawFlights.length && (
                  <span className="text-slate-400"> (of {rawFlights.length})</span>
                )}
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="cheapest">Cheapest</option>
              <option value="fastest">Fastest</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            {error}
          </div>
        )}

        {!error && loading && (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <div className="hidden lg:block">
              <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
            </div>
            <div>
              <ResultsSkeletonList count={5} />
            </div>
          </div>
        )}

        {!error && !loading && rawFlights.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">No flights found</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">
              Try <strong>New York</strong> → <strong>Los Angeles</strong> on{' '}
              <strong>2026-04-10</strong>, or <strong>San Francisco</strong> → <strong>Seattle</strong>.
              Ensure the API is running and the database is seeded.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
            >
              New search
            </Link>
          </div>
        )}

        {!error && !loading && rawFlights.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <FilterSidebar
                flights={rawFlights}
                priceMin={priceBounds[0]}
                priceMax={priceBounds[1]}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                stopsFilter={stopsFilter}
                onStopsFilterChange={setStopsFilter}
                airlineEnabled={airlineEnabled}
                onAirlineToggle={toggleAirline}
                onReset={resetFilters}
                className="lg:sticky lg:top-24"
              />
            </div>

            <div>
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
                  <p className="font-medium text-amber-900">No flights match your filters</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Relax the price range, stops, or airline selection.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {visible.map((f) => (
                    <li key={f.id}>
                      <FlightCard flight={f} search={search} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
