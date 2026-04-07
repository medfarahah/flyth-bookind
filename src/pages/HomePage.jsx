import { SearchForm } from '../components/SearchForm'

export function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-slate-50" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Find your next flight
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Compare fares, filter by stops and airline, and book in minutes — inspired by the
            clarity of modern travel search.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <SearchForm />
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { t: 'Transparent pricing', d: 'See taxes and fare breakdown before you commit.' },
            { t: 'Smart filters', d: 'Slice results by price, stops, and carrier.' },
            { t: 'Mobile ready', d: 'Search and book comfortably on any screen size.' },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">{item.t}</p>
              <p className="mt-1 text-sm text-slate-600">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
