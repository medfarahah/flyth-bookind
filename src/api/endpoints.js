/**
 * Backend route paths (Express has no /api prefix; Vite adds /api in dev via proxy).
 */
export const API = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
  },
  flights: {
    search: (query) => `/flights?${query}`,
    /** SerpAPI Google Flights — IATA codes + YYYY-MM-DD */
    serp: (query) => `/flights/serp?${query}`,
    /** SerpAPI Google Travel Explore — departure_id as IATA or /m/… kgmid */
    explore: (query) => `/flights/explore?${query}`,
  },
  bookings: {
    create: '/bookings',
    mine: '/bookings/my',
  },
}
