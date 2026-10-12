// localStorage can throw (private mode, disabled storage) — never let that crash the app.
function safe(fn, fallback = null) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

const TOKEN_KEY = 'catalog.token'
const USER_KEY = 'catalog.user'

export const tokenStorage = {
  get: () => safe(() => localStorage.getItem(TOKEN_KEY)),
  set: (token) => safe(() => localStorage.setItem(TOKEN_KEY, token)),
  clear: () => safe(() => localStorage.removeItem(TOKEN_KEY)),
}

export const userStorage = {
  get: () => safe(() => JSON.parse(localStorage.getItem(USER_KEY))),
  set: (user) => safe(() => localStorage.setItem(USER_KEY, JSON.stringify(user))),
  clear: () => safe(() => localStorage.removeItem(USER_KEY)),
}

/** Reads the exp claim (ms) without verifying — verification is the server's job. */
export function getTokenExpiry(token) {
  return safe(() => {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? payload.exp * 1000 : null
  })
}
