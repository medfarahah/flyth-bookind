export function LoadingSpinner({ label = 'Loading flights…' }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  )
}
