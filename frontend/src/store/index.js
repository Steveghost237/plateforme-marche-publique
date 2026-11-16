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
    hydraterPanier()   // restaure le panier sauvegardé en base (multi-appareils)
  },
  setUser: (user) => set({ user }),
  logout: () => {
    // Tokens retirés AVANT de vider le panier local : la sync serveur est
    // désactivée sans token → le panier persisté en base reste intact.
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    usePanier.getState().clear()   // panier local vidé (vie privée, appareil partagé)
    set({ user: null, isAuth: false })
  },
  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isAuth: true })
      hydraterPanier()
    } catch { get().logout() }
  },
}), { name: 'auth', partialize: s => ({ user: s.user, isAuth: s.isAuth }) }))

// ── PANIER ────────────────────────────────────────────────────
export const usePanier = create(persist((set, get) => ({
  lignes: [], // [{produit, quantite, prixUnit, ingredients:[], note, key}]

  add: (produit, quantite, prixUnit, ingredients = [], note = null, key = null) => {
    const lignes = get().lignes
    const k = key || produit.id
    const idx = lignes.findIndex(l => (l.key || l.produit.id) === k)
    if (idx >= 0 && !note) {
      const next = [...lignes]
      next[idx] = { ...next[idx], quantite: next[idx].quantite + quantite }
      set({ lignes: next })
    } else {
      set({ lignes: [...lignes, { produit, quantite, prixUnit, ingredients, note, key: k, selected: true }] })
    }
  },
  // Article personnalisé (section "Ma Liste") — chaque ligne reste distincte
  addCustom: (produit, { nom, quantite = 1, prixUnit = 0 }) => {
    const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    set(s => ({ lignes: [...s.lignes, {
      produit, quantite, prixUnit, ingredients: [], note: nom, key, custom: true, selected: true,
    }] }))
  },
  // Sélection au checkout : le client choisit quels articles commander
  toggleSelect: (id) => set(s => ({ lignes: s.lignes.map(l =>
    (l.key || l.produit.id) === id ? { ...l, selected: l.selected === false } : l) })),
  setAllSelected: (v) => set(s => ({ lignes: s.lignes.map(l => ({ ...l, selected: v })) })),
  // Retire uniquement les lignes commandées — les non-sélectionnées restent au panier
  removeKeys: (keys) => set(s => ({ lignes: s.lignes.filter(l => !keys.includes(l.key || l.produit.id)) })),
  setQty: (id, q) => {
    if (q <= 0) set(s => ({ lignes: s.lignes.filter(l => (l.key || l.produit.id) !== id) }))
    else set(s => ({ lignes: s.lignes.map(l => (l.key || l.produit.id) === id ? { ...l, quantite: q } : l) }))
  },
  remove: (id) => set(s => ({ lignes: s.lignes.filter(l => (l.key || l.produit.id) !== id) })),
  clear: () => set({ lignes: [] }),

  get count() { return get().lignes.reduce((a, l) => a + l.quantite, 0) },
  get sousTotal() { return get().lignes.reduce((a, l) => a + l.prixUnit * l.quantite, 0) },
  get fraisLivraison() {
    const PRODUIT_TEST = '88a2bd29-d234-4ec8-a35b-6470be95d328'
    const lignes = get().lignes
    if (lignes.length > 0 && lignes.every(l => l.produit.id === PRODUIT_TEST)) return 0
    return 1000
  },
  get total() { return get().sousTotal + get().fraisLivraison },
}), { name: 'panier' }))

// ── SYNC PANIER SERVEUR ───────────────────────────────────────
// Le panier est persisté en base (table panier_items) pour l'utilisateur
// connecté : retrouvé sur tout appareil et toute session.
let _panierSyncTimer = null
function pushPanierToServer() {
  clearTimeout(_panierSyncTimer)
  _panierSyncTimer = setTimeout(() => {
    if (!localStorage.getItem('access_token')) return
    const lignes = usePanier.getState().lignes.map(l => ({
      key:         l.key || l.produit.id,
      produit_id:  l.produit.id,
      quantite:    l.quantite,
      prixUnit:    l.prixUnit,
      ingredients: l.ingredients || [],
      note:        l.note || null,
      selected:    l.selected !== false,
    }))
    api.put('/panier/', { lignes }).catch(() => {})
  }, 600)
}

// Toute modification du panier (ajout, retrait, quantité, sélection,
// vidage) déclenche la sync — débouncée pour absorber les clics rapides.
usePanier.subscribe((state, prev) => {
  if (state.lignes !== prev.lignes) pushPanierToServer()
})

// À la connexion : fusionne le panier serveur dans le panier local
// (les lignes locales absentes du serveur sont remontées ensuite).
export async function hydraterPanier() {
  if (!localStorage.getItem('access_token')) return
  try {
    const { data } = await api.get('/panier/')
    const cles = new Set(usePanier.getState().lignes.map(l => l.key || l.produit.id))
    const manquantes = (data || []).filter(l => !cles.has(l.key))
    if (manquantes.length) {
      usePanier.setState(s => ({ lignes: [...s.lignes, ...manquantes] }))
      // setState déclenche le subscribe → le panier fusionné est repoussé
    }
  } catch {}
}
