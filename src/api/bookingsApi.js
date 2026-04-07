import { getJson, postJson } from './client.js'
import { API } from './endpoints.js'

export function createBooking({ flightId, passengers }) {
  return postJson(API.bookings.create, { flightId, passengers })
}

export function fetchMyBookings() {
  return getJson(API.bookings.mine)
}
