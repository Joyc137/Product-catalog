import { api } from './client'

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  me: (signal) => api.get('/auth/me', { signal }).then((r) => r.data.user),
}
