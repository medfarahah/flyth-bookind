import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createBooking } from '../api/bookingsApi.js'
import { ApiError } from '../api/client.js'
import { formatDuration, formatTime, stopsLabel } from '../utils/flightFormat.js'

function emptyPassengers(n) {
  return Array.from({ length: n }, () => ({
    fullName: '',
    email: '',
    phone: '',
  }))
}

export function BookingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const flight = location.state?.flight
  const search = location.state?.search

  const count = useMemo(
    () => Math.min(9, Math.max(1, Number(search?.passengers) || 1)),
    [search?.passengers]
  )

  const [passengers, setPassengers] = useState(() => emptyPassengers(count))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!flight) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-slate-600">No flight selected.</p>
        <Link to="/" className="mt-4 inline-block font-medium text-blue-600 hover:underline">
          Start a search
        </Link>
      </div>
    )
  }

  const total = flight.price * count

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const validate = () => {
    const next = {}
    passengers.forEach((p, i) => {
      if (!p.fullName.trim()) next[`name_${i}`] = 'Enter full name'
      if (!p.email.trim()) next[`email_${i}`] = 'Enter email'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
        next[`email_${i}`] = 'Enter a valid email'
      if (!p.phone.trim()) next[`phone_${i}`] = 'Enter phone'
      else if (p.phone.replace(/\D/g, '').length < 10) next[`phone_${i}`] = 'Enter a valid phone'
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await createBooking({
        flightId: flight.id,
        passengers: passengers.map((p) => ({
          fullName: p.fullName.trim(),
          email: p.email.trim(),
          phone: p.phone.trim(),
        })),
      })
      navigate('/bookings', { replace: true })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Booking failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-blue-50/50 to-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
        >
          ← Back to results
        </button>

        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Complete your booking</h1>
        <p className="mt-1 text-slate-600">Review your flight and enter passenger details.</p>

        <div className="mt-8 space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Selected flight
            </h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{flight.airline}</p>
                <p className="text-sm text-slate-500">{flight.flightNumber}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {flight.from.city} ({flight.from.code}) → {flight.to.city} ({flight.to.code})
                </p>
                <p className="text-sm text-slate-600">
                  {formatTime(flight.departure)} – {formatTime(flight.arrival)} ·{' '}
                  {formatDuration(flight.durationMinutes)} · {stopsLabel(flight.stops)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">
                  {count} × ${flight.price} USD
                </p>
                <p className="text-2xl font-bold text-blue-600">${total}</p>
                <p className="text-xs text-slate-400">Total before taxes &amp; fees</p>
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Passenger details
            </h2>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError}
              </div>
            )}

            <div className="mt-4 space-y-8">
              {passengers.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Passenger {i + 1}</p>
                  <div className="space-y-3">
                    <label className="block text-left">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Full name</span>
                      <input
                        type="text"
                        value={p.fullName}
                        onChange={(e) => updatePassenger(i, 'fullName', e.target.value)}
                        autoComplete="name"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {errors[`name_${i}`] && (
                        <span className="mt-1 block text-sm text-red-600">{errors[`name_${i}`]}</span>
                      )}
                    </label>
                    <label className="block text-left">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
                      <input
                        type="email"
                        value={p.email}
                        onChange={(e) => updatePassenger(i, 'email', e.target.value)}
                        autoComplete="email"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {errors[`email_${i}`] && (
                        <span className="mt-1 block text-sm text-red-600">{errors[`email_${i}`]}</span>
                      )}
                    </label>
                    <label className="block text-left">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Phone</span>
                      <input
                        type="tel"
                        value={p.phone}
                        onChange={(e) => updatePassenger(i, 'phone', e.target.value)}
                        autoComplete="tel"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {errors[`phone_${i}`] && (
                        <span className="mt-1 block text-sm text-red-600">{errors[`phone_${i}`]}</span>
                      )}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? 'Booking…' : 'Book flight'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
