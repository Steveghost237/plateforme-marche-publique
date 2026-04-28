// src/utils/api.js
import axios from 'axios'

let _base = import.meta.env.VITE_API_URL || 'https://comebuy-api.onrender.com/api'
if (!_base.endsWith('/api')) _base = _base.replace(/\/+$/, '') + '/api'
const API_BASE = _base
const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('access_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(r => r, async err => {
  const orig = err.config
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true
    const rt = localStorage.getItem('refresh_token')
    if (rt) {
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: rt })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        orig.headers.Authorization = `Bearer ${data.access_token}`
        return api(orig)
      } catch { localStorage.removeItem('auth'); window.location.href = '/connexion' }
    }
  }
  return Promise.reject(err)
})

export const API_ORIGIN = API_BASE.replace('/api', '')

export function getImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Encoder chaque segment du path (gère espaces et accents)
  const path = url.startsWith('/') ? url : '/' + url
  const encoded = path.split('/').map(s => s ? encodeURIComponent(s) : s).join('/')
  return `${API_ORIGIN}${encoded}`
}

export default api
