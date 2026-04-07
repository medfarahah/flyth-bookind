/**
 * HTTP client for the Flyth API (Express).
 *
 * - Dev (default): same-origin `/api` → Vite proxy → backend (no CORS hassle).
 * - Or set VITE_API_URL to the full API origin, e.g. http://localhost:4000
 */

function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL
  const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : ''
  if (trimmed) return trimmed.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api'
  return 'http://localhost:4000'
}

const BASE = resolveApiBase()

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** @type {null | (() => Promise<string | null>)} */
let clerkTokenGetter = null

export function setClerkTokenGetter(fn) {
  clerkTokenGetter = fn
}

export function getToken() {
  return localStorage.getItem('token')
}

export function getStoredUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = { ...options.headers }
  const isJsonBody =
    options.body &&
    typeof options.body === 'string' &&
    !headers['Content-Type'] &&
    !headers['content-type']
  if (isJsonBody) headers['Content-Type'] = 'application/json'

  let token = null
  if (clerkTokenGetter) {
    try {
      token = await clerkTokenGetter()
    } catch {
      token = null
    }
  }
  if (!token) token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  const body = await parseBody(res)

  if (!res.ok) {
    const msg = typeof body?.error === 'string' ? body.error : res.statusText || 'Request failed'
    throw new ApiError(msg, res.status)
  }
  return body
}

export function getJson(path) {
  return apiFetch(path, { method: 'GET' })
}

export function postJson(path, data) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(data) })
}
