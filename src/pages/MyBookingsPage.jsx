import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyBookings } from '../api/bookingsApi.js'
import { ApiError } from '../api/client.js'
import { formatTime } from '../utils/flightFormat.js'
import { Loader } from '../components/Loader.jsx'

export function MyBookingsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      try {
        const data = await fetchMyBookings()
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : 'Could not load bookings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <Loader label="Loading your bookings…" />
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-700">{error}</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My bookings</h1>
      <p className="mt-1 text-slate-600">Trips tied to your account.</p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No bookings yet.{' '}
          <Link to="/" className="font-semibold text-blue-600 hover:underline">
            Search flights
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{b.flight.airline}</p>
                  <p className="text-sm text-slate-600">
                    {b.flight.from} → {b.flight.to}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatTime(b.flight.departureTime)} – {formatTime(b.flight.arrivalTime)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Booked {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-blue-600">${Number(b.totalPrice).toFixed(2)}</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {Array.isArray(b.passengers) ? b.passengers.length : 0} passenger(s)
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
