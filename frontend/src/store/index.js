import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

export { useLang } from './langStore'

// ── AUTH ──────────────────────────────────────────────────────
export const useAuth = create(persist((set, get) => ({
  user: null,
  isAuth: false,
  setAuth: (user, access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ user, isAuth: true })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuth: false })
  },
  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isAuth: true })
    } catch { get().logout() }
  },
}), { name: 'auth', partialize: s => ({ user: s.user, isAuth: s.isAuth }) }))

// ── PANIER ────────────────────────────────────────────────────
export const usePanier = create(persist((set, get) => ({
  lignes: [], // [{produit, quantite, prixUnit, ingredients:[]}]

  add: (produit, quantite, prixUnit, ingredients = []) => {
    const lignes = get().lignes
    const idx = lignes.findIndex(l => l.produit.id === produit.id)
    if (idx >= 0) {
      const next = [...lignes]
      next[idx] = { ...next[idx], quantite: next[idx].quantite + quantite }
      set({ lignes: next })
    } else {
      set({ lignes: [...lignes, { produit, quantite, prixUnit, ingredients }] })
    }
  },
  setQty: (id, q) => {
    if (q <= 0) set(s => ({ lignes: s.lignes.filter(l => l.produit.id !== id) }))
    else set(s => ({ lignes: s.lignes.map(l => l.produit.id === id ? { ...l, quantite: q } : l) }))
  },
  remove: (id) => set(s => ({ lignes: s.lignes.filter(l => l.produit.id !== id) })),
  clear: () => set({ lignes: [] }),

  get count() { return get().lignes.reduce((a, l) => a + l.quantite, 0) },
  get sousTotal() { return get().lignes.reduce((a, l) => a + l.prixUnit * l.quantite, 0) },
  get fraisLivraison() { const st = get().lignes.reduce((a, l) => a + l.prixUnit * l.quantite, 0); return st >= 5000 ? 0 : 500 },
  get total() { const st = get().lignes.reduce((a, l) => a + l.prixUnit * l.quantite, 0); return st + (st >= 5000 ? 0 : 500) },
}), { name: 'panier' }))
