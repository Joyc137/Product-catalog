import { api } from './client'

export const productsApi = {
  list: (params, signal) => api.get('/products', { params, signal }).then((r) => r.data),
  get: (id, signal) => api.get(`/products/${id}`, { signal }).then((r) => r.data.product),
  categories: (signal) => api.get('/products/categories', { signal }).then((r) => r.data.categories),
  create: (payload) => api.post('/products', payload).then((r) => r.data.product),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data.product),
  remove: (id) => api.delete(`/products/${id}`),
  categoryStats: (signal) => api.get('/products/stats/categories', { signal }).then((r) => r.data.stats),
}
