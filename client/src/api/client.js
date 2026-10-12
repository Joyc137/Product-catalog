import axios from 'axios'
import { tokenStorage } from '../utils/storage'

export const AUTH_EXPIRED_EVENT = 'auth:expired'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Normalised error shape used everywhere in the UI. */
export class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message)
    this.status = status
    this.details = details
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    if (!error.response) {
      return Promise.reject(new ApiError("Can't reach the server. Check your connection and try again."))
    }

    const { status, data } = error.response

    // A 401 on an authenticated request means the session is gone (expired/revoked).
    if (status === 401 && error.config?.headers?.Authorization) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }

    const message =
      data?.message || (status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed')
    return Promise.reject(new ApiError(message, status, data?.details || []))
  },
)

export const isCancelled = (error) => axios.isCancel(error)
