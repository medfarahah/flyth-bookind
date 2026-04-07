import { useMemo } from 'react'

export function FilterSidebar({
  flights,
  priceMin,
  priceMax,
  priceRange,
  onPriceRangeChange,
  stopsFilter,
  onStopsFilterChange,
  airlineEnabled,
  onAirlineToggle,
  onReset,
  className = '',
}) {
  const airlines = useMemo(() => {
    const set = new Set(flights.map((f) => f.airline))
    return [...set].sort()
  }, [flights])

  const globalMin = useMemo(
    () => (flights.length ? Math.min(...flights.map((f) => f.price)) : 0),
    [flights]
  )
  const globalMax = useMemo(
    () => (flights.length ? Math.max(...flights.map((f) => f.price)) : 500),
    [flights]
  )

  return (
    <aside
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
        >
          Reset
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Price (USD)
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="tabular-nums">${priceRange[0]}</span>
            <span className="text-slate-300">—</span>
            <span className="tabular-nums">${priceRange[1]}</span>
          </div>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="sr-only">Minimum price</span>
              <input
                type="range"
                min={priceMin}
                max={priceMax}
                value={Math.min(priceRange[0], priceRange[1])}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  onPriceRangeChange([Math.min(v, priceRange[1]), priceRange[1]])
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
              />
            </label>
            <label className="block">
              <span className="sr-only">Maximum price</span>
              <input
                type="range"
                min={priceMin}
                max={priceMax}
                value={Math.max(priceRange[0], priceRange[1])}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  onPriceRangeChange([priceRange[0], Math.max(v, priceRange[0])])
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
              />
            </label>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Range {globalMin}–{globalMax} on this route
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stops
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'any', label: 'Any' },
              { id: 0, label: 'Nonstop' },
              { id: 1, label: '1 stop' },
              { id: 2, label: '2+ stops' },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => onStopsFilterChange(opt.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  stopsFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Airlines
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {airlines.map((name) => (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={Boolean(airlineEnabled[name])}
                    onChange={() => onAirlineToggle(name)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
