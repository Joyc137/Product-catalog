import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/auth'
import { AUTH_EXPIRED_EVENT } from '../api/client'
import { getTokenExpiry, tokenStorage, userStorage } from '../utils/storage'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

function hasValidToken() {
  const token = tokenStorage.get()
  const expiry = token && getTokenExpiry(token)
  return Boolean(expiry && expiry > Date.now())
}

export function AuthProvider({ children }) {
  const toast = useToast()
  const [user, setUser] = useState(() => (hasValidToken() ? userStorage.get() : null))
  // "checking" while we confirm a stored session with the server on first load.
  const [status, setStatus] = useState(() => (hasValidToken() ? 'checking' : 'ready'))

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    userStorage.clear()
    setUser(null)
  }, [])

  const startSession = useCallback(({ token, user: nextUser }) => {
    tokenStorage.set(token)
    userStorage.set(nextUser)
    setUser(nextUser)
  }, [])

  // Re-validate a stored session (the role may have changed or the user been deleted).
  useEffect(() => {
    if (!hasValidToken()) {
      // Initial state is already logged-out; just drop stale storage.
      tokenStorage.clear()
      userStorage.clear()
      return undefined
    }
    const controller = new AbortController()
    authApi
      .me(controller.signal)
      .then((freshUser) => {
        userStorage.set(freshUser)
        setUser(freshUser)
      })
      .catch((err) => {
        if (err?.status === 401) clearSession()
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatus('ready')
      })
    return () => controller.abort()
  }, [clearSession])

  // Server said the token is no longer valid.
  useEffect(() => {
    const onExpired = () => {
      if (!tokenStorage.get()) return
      clearSession()
      toast.info('Your session has expired. Please log in again.')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [clearSession, toast])

  // Log out proactively when the JWT expires while the tab is open.
  useEffect(() => {
    if (!user) return undefined
    const expiry = getTokenExpiry(tokenStorage.get())
    if (!expiry) return undefined
    const id = setTimeout(() => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)), Math.max(0, expiry - Date.now()))
    return () => clearTimeout(id)
  }, [user])

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession])
  const register = useCallback(async (payload) => startSession(await authApi.register(payload)), [startSession])
  const logout = useCallback(() => {
    clearSession()
    toast.success('You have been logged out.')
  }, [clearSession, toast])

  const value = useMemo(
    () => ({ user, status, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
