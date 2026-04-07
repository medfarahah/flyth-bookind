export function FlightCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex justify-between">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="h-6 w-20 rounded-lg bg-slate-200" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-28 rounded bg-slate-200" />
        </div>
        <div className="h-px flex-1 bg-slate-100" />
        <div className="flex-1 space-y-2 text-right">
          <div className="ml-auto h-4 w-24 rounded bg-slate-200" />
          <div className="ml-auto h-8 w-28 rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-9 w-28 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}

export function ResultsSkeletonList({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FlightCardSkeleton key={i} />
      ))}
    </div>
  )
}
