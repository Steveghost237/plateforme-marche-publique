import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Star, Bell, MapPin, LogOut, ChevronRight, Check, Clock, Truck, XCircle, Heart, HelpCircle, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../store'

const NIVEAUX_INFO = {
  bronze: { emoji:'🥉', label:'Bronze',  color:'text-amber-700 bg-amber-100', min:0,     max:999  },
  argent: { emoji:'🥈', label:'Argent',  color:'text-gray-500 bg-gray-100',   min:1000,  max:4999 },
  or:     { emoji:'🥇', label:'OR',      color:'text-amber-600 bg-amber-50',  min:5000,  max:9999 },
  vip:    { emoji:'👑', label:'VIP',     color:'text-purple-600 bg-purple-50',min:10000, max:null },
}

// ── PROFIL ─────────────────────────────────────────────────────
export function Profil() {
  const { user, logout } = useAuth(s => ({ user:s.user, logout:s.logout }))
  const navigate = useNavigate()
  const [form, setForm] = useState({ nom_complet: user?.nom_complet || '', email: user?.email || '' })
  const [loading, setLoading] = useState(false)
  const [fidelite, setFidelite] = useState(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    api.get('/fidelite/compte').then(r => setFidelite(r.data)).catch(() => {})
  }, [])

  const save = async () => {
    setLoading(true)
    try {
      await api.put('/auth/me', form)
      toast.success('Profil mis à jour')
      setEditMode(false)
    } catch { toast.error('Erreur') } finally { setLoading(false) }
  }

  const niv = fidelite ? (NIVEAUX_INFO[fidelite.niveau] || NIVEAUX_INFO.bronze) : null
  const initials = user?.nom_complet?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?'

  const MENU_ITEMS = [
    { to:'/commandes',     emoji:'📦', label:'Mes commandes',      sub:`${12} commandes passées` },
    { to:'/adresses',      emoji:'📍', label:'Mes adresses',       sub:'2 adresses enregistrées' },
    { to:'/fidelite',      emoji:'⭐', label:'Programme fidélité', sub: fidelite ? `${fidelite.points_actuels?.toLocaleString()} pts · Niveau ${niv?.label}` : 'Chargement...' },
    { to:'/notifications', emoji:'🔔', label:'Notifications',      sub:'Gérer mes notifications' },
    { to:'/aide',          emoji:'❓', label:'Aide & Support',     sub:'FAQ, nous contacter' },
  ]

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header profil */}
      <div className="bg-gradient-to-br from-[#0D2137] to-[#1B4A7A] px-6 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1B6CA8] border-2 border-amber-400 flex items-center justify-center text-white font-bold text-2xl font-serif mx-auto mb-3">
          {initials}
        </div>
        <p className="font-serif text-white font-bold text-lg">{user?.nom_complet}</p>
        <p className="text-white/50 text-xs mt-0.5">{user?.telephone}</p>
        {niv && (
          <div className="inline-flex items-center gap-1.5 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mt-3">
            <span>{niv.emoji}</span> Niveau {niv.label} · {fidelite.points_actuels?.toLocaleString()} pts
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Infos éditables */}
        {editMode ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-[#0D2137] text-sm">Modifier le profil</h2>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">Nom complet</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" value={form.nom_complet} onChange={e => setForm({...form, nom_complet: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">Email (optionnel)</label>
              <input type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" placeholder="exemple@mail.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">Téléphone (non modifiable)</label>
              <input className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400" value={user?.telephone} disabled/>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={loading}
                className="flex-1 bg-[#0D2137] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Enregistrer'}
              </button>
              <button onClick={() => setEditMode(false)}
                className="flex-1 border border-gray-200 text-gray-500 font-medium py-2.5 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditMode(true)}
            className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-[#F0F4F8] rounded-xl flex items-center justify-center text-sm">✏️</div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[#0D2137] text-sm">Modifier mon profil</p>
              <p className="text-xs text-gray-400">{user?.nom_complet}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300"/>
          </button>
        )}

        {/* Menu items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {MENU_ITEMS.map(m => (
            <Link key={m.to} to={m.to}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-[#F0F4F8] rounded-xl flex items-center justify-center text-base shrink-0">{m.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0D2137] text-sm">{m.label}</p>
                <p className="text-xs text-gray-400 truncate">{m.sub}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 shrink-0"/>
            </Link>
          ))}
        </div>

        {/* Déconnexion */}
        <button onClick={() => { logout(); navigate('/') }}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut size={16} className="text-red-500"/>
          </div>
          <span className="font-semibold text-red-500 text-sm">Se déconnecter</span>
        </button>

        <div className="text-center pb-6">
          <p className="text-xs text-gray-300">MARCHÉ EN LIGNE · © 2026</p>
        </div>
      </div>
    </div>
  )
}

// ── MES COMMANDES ─────────────────────────────────────────────
export function MesCommandes() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuth) { navigate('/connexion'); return }
    api.get('/commandes/mes-commandes').then(r => setCommandes(r.data)).catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuth])

  const annuler = async (id) => {
    try {
      await api.post(`/commandes/${id}/annuler`)
      setCommandes(prev => prev.map(c => c.id === id ? {...c, statut:'annulee'} : c))
      toast.success('Commande annulée')
    } catch(err) { toast.error(err.response?.data?.detail || 'Impossible d\'annuler') }
  }

  const STATUT_CONFIG = {
    brouillon:           { label:'Brouillon',   emoji:'📝', bg:'bg-gray-100',  text:'text-gray-600' },
    en_attente_paiement: { label:'En attente',  emoji:'⏳',  bg:'bg-amber-50', text:'text-amber-600' },
    payee:               { label:'Payée',       emoji:'✅',  bg:'bg-blue-50',  text:'text-blue-600'  },
    assignee:            { label:'Assignée',    emoji:'🛕',  bg:'bg-blue-50',  text:'text-blue-600'  },
    en_cours_marche:     { label:'Au marché',   emoji:'🛍️',  bg:'bg-blue-50',  text:'text-blue-600'  },
    en_livraison:        { label:'En route',    emoji:'🚀',  bg:'bg-amber-50', text:'text-amber-600' },
    livree:              { label:'Livrée',      emoji:'🎉',  bg:'bg-green-50', text:'text-green-600' },
    annulee:             { label:'Annulée',     emoji:'❌',  bg:'bg-red-50',   text:'text-red-500'   },
  }

  const isActive = (s) => ['payee','assignee','en_cours_marche','en_livraison'].includes(s)

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-serif text-white font-bold text-xl">📦 Mes Commandes</h1>
          <Link to="/catalogue/menus_ingredients"
            className="text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">+ Commander</Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="bg-white rounded-2xl h-24 animate-pulse"/>)}</div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Package size={36} className="text-gray-200"/>
            </div>
            <p className="text-gray-400 font-medium mb-4">Aucune commande pour le moment</p>
            <Link to="/catalogue/menus_ingredients"
              className="bg-[#0D2137] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
              Commander maintenant
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {commandes.map(c => {
              const s = STATUT_CONFIG[c.statut] || { label:c.statut, emoji:'🔵', bg:'bg-gray-50', text:'text-gray-500' }
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                    <div>
                      <span className="font-bold text-[#0D2137] text-sm">{c.numero}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'})}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                        {s.emoji} {s.label}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      {c.creneau && <p className="text-xs text-gray-500">⏰ {c.creneau.replace(/_/g,' ')}</p>}
                      {c.points_gagnes > 0 && <p className="text-xs text-amber-500">⭐ +{c.points_gagnes} pts fidélité</p>}
                    </div>
                    <p className="font-bold text-amber-500 text-base">{c.total_fcfa?.toLocaleString()} F</p>
                  </div>
                  <div className="px-4 pb-3 flex gap-2">
                    {isActive(c.statut) && (
                      <Link to={`/suivi/${c.id}`}
                        className="flex-1 bg-[#0D2137] text-white font-bold py-2 rounded-xl text-xs text-center hover:bg-amber-400 hover:text-gray-900 transition-all">
                        🗺️ Suivre en direct
                      </Link>
                    )}
                    {c.statut === 'livree' && (
                      <Link to={`/sondage/${c.id}`}
                        className="flex-1 bg-amber-50 text-amber-600 font-bold py-2 rounded-xl text-xs text-center border border-amber-200 hover:bg-amber-100 transition-colors">
                        📋 Donner mon avis
                      </Link>
                    )}
                    {['brouillon','en_attente_paiement','payee'].includes(c.statut) && (
                      <button onClick={() => annuler(c.id)}
                        className="text-red-400 text-xs hover:text-red-600 transition-colors px-3">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FIDÉLITÉ ──────────────────────────────────────────────────────
export function Fidelite() {
  const [compte, setCompte] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [recompenses, setRecompenses] = useState([])
  const { isAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuth) { navigate('/connexion'); return }
    Promise.all([
      api.get('/fidelite/compte'),
      api.get('/fidelite/transactions').catch(() => ({ data: [] })),
      api.get('/fidelite/recompenses').catch(() => ({ data: [] })),
    ]).then(([c, t, r]) => {
      setCompte(c.data)
      setTransactions(t.data || [])
      setRecompenses(r.data || [])
    }).catch(() => {})
  }, [isAuth])

  const PALIERS = [
    { code:'bronze', emoji:'🥉', label:'Bronze', min:0,     max:999,  color:'text-amber-700', bg:'bg-amber-50', border:'border-amber-200' },
    { code:'argent', emoji:'🥈', label:'Argent', min:1000,  max:4999, color:'text-gray-600',  bg:'bg-gray-100', border:'border-gray-200' },
    { code:'or',     emoji:'🥇', label:'OR',     min:5000,  max:9999, color:'text-amber-600', bg:'bg-amber-50', border:'border-amber-400' },
    { code:'vip',    emoji:'👑', label:'VIP',    min:10000, max:null, color:'text-purple-600',bg:'bg-purple-50',border:'border-purple-300' },
  ]

  const RECOMPENSES_DEFAUT = [
    { emoji:'🎁', nom:'−15% sur votre commande', desc:'Valable 30 jours · Niveau OR', pts:750 },
    { emoji:'🚚', nom:'Livraison offerte',          desc:'Sur prochaine commande',     pts:500 },
    { emoji:'🛒', nom:'Produit offert',             desc:'Fruit au choix ≤ 500F',      pts:1000 },
  ]

  if (!compte) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5EFE6]">
      <div className="w-8 h-8 border-2 border-[#0D2137]/20 border-t-[#0D2137] rounded-full animate-spin"/>
    </div>
  )

  const pts       = compte.points_actuels || 0
  const palierIdx = PALIERS.findIndex(p => p.max === null || pts <= p.max)
  const palierActuel  = PALIERS[Math.max(0, PALIERS.findIndex(p => pts >= p.min && (p.max === null || pts <= p.max)))]
  const prochainPalier = PALIERS.find(p => p.min > pts)
  const progressPct = prochainPalier
    ? Math.min(100, ((pts - palierActuel.min) / (prochainPalier.min - palierActuel.min)) * 100)
    : 100

  const recompsAffichees = recompenses.length > 0 ? recompenses : RECOMPENSES_DEFAUT

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0D2137] to-[#1B4A7A] px-6 pt-6 pb-8 text-center">
        <h1 className="font-serif text-white font-bold text-xl mb-1">Programme Fidélité</h1>
        <div className="font-serif text-amber-400 font-bold text-5xl leading-none my-3">{pts.toLocaleString()}</div>
        <p className="text-white/60 text-xs">points · Niveau {palierActuel?.label} {palierActuel?.emoji}</p>
        {prochainPalier && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-white/15 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{width:`${progressPct}%`}}/>
            </div>
            <p className="text-xs text-white/40 text-right">{(prochainPalier.min - pts).toLocaleString()} pts avant {prochainPalier.label} {prochainPalier.emoji}</p>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Paliers */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-[#0D2137] text-sm mb-3">Niveaux du programme</h2>
          <div className="grid grid-cols-4 gap-2">
            {PALIERS.map(p => {
              const isActuel = p.code === palierActuel?.code
              return (
                <div key={p.code}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                    ${isActuel ? `${p.bg} ${p.border} border-2` : 'border-transparent opacity-50'}`}>
                  <span className="text-xl">{p.emoji}</span>
                  <span className={`text-[10px] font-bold ${isActuel ? p.color : 'text-gray-400'}`}>
                    {p.label} {isActuel ? '←' : ''}
                  </span>
                  <span className="text-[9px] text-gray-400">{p.min >= 1000 ? `${p.min/1000}K` : p.min}+</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Récompenses */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-[#0D2137] text-sm mb-3">Récompenses disponibles</h2>
          <div className="space-y-2">
            {recompsAffichees.map((r, i) => (
              <div key={r.id || i} className="flex items-center gap-3 p-3 bg-[#F5EFE6] rounded-xl">
                <span className="text-2xl shrink-0">{r.emoji || r.icone || '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0D2137] text-xs">{r.nom}</p>
                  <p className="text-gray-400 text-[10px]">{r.desc || r.description}</p>
                </div>
                <div className="text-amber-500 font-bold text-xs shrink-0">
                  {(r.pts || r.cout_points || 0).toLocaleString()} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-[#0D2137] text-sm mb-3">Historique des points</h2>
            <div className="space-y-0 divide-y divide-gray-50">
              {transactions.slice(0,10).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.points > 0 ? 'bg-green-400' : 'bg-red-400'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0D2137] text-xs font-medium truncate">{t.description || t.type}</p>
                    <p className="text-gray-400 text-[10px]">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`font-bold text-xs ${t.points > 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {t.points > 0 ? '+' : ''}{t.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Règles */}
        <div className="bg-[#0D2137] rounded-2xl p-4">
          <p className="text-amber-400 font-bold text-xs mb-2">Comment gagner des points ?</p>
          <ul className="space-y-1 text-xs text-white/60">
            <li>• 1 point par tranche de 500 FCFA dépensés</li>
            <li>• +50 pts si sondage post-livraison complété</li>
            <li>• Points valables 12 mois</li>
            <li>• Échange possible à tout moment</li>
          </ul>
        </div>

        <div className="pb-4"/>
      </div>
    </div>
  )
}

// ── NOTIFICATIONS ──────────────────────────────────────────────
export function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications/').then(r => setNotifs(r.data)).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const lireTout = async () => {
    await api.post('/notifications/tout-lire')
    setNotifs(prev => prev.map(n => ({ ...n, lue: true })))
    toast.success('Toutes les notifications marquées comme lues')
  }

  const ICONS = { commande_confirmee:'✅', livreur_assigne:'🛵', commande_livree:'🎉', points_gagnes:'⭐', default:'🔔' }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-serif text-navy text-4xl">Notifications</h1>
          {notifs.some(n => !n.lue) && (
            <button onClick={lireTout} className="btn-ghost text-sm">Tout marquer comme lu</button>
          )}
        </div>
        {loading ? <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="card h-16 animate-pulse"/>)}</div>
        : notifs.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={50} className="mx-auto text-gray-200 mb-4"/>
            <p className="text-gray-400">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className={`card p-4 flex gap-3 transition-opacity ${n.lue ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-lg shrink-0">
                  {ICONS[n.type] || ICONS.default}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm ${n.lue ? 'font-normal text-gray-600' : 'font-semibold text-navy'}`}>{n.titre}</p>
                    {!n.lue && <div className="w-2 h-2 rounded-full bg-blue shrink-0 mt-1 ml-2"/>}
                  </div>
                  {n.corps && <p className="text-xs text-gray-400 mt-0.5">{n.corps}</p>}
                  <p className="text-xs text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString('fr-FR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
