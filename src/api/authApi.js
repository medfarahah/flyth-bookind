import { postJson } from './client.js'
import { API } from './endpoints.js'

export function registerRequest(email, password) {
  return postJson(API.auth.register, { email, password })
}

export function loginRequest(email, password) {
  return postJson(API.auth.login, { email, password })
}
