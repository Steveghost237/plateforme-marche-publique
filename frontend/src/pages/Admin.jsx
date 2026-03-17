import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, Bike, Settings, TrendingUp, ShoppingBag, CheckCircle, XCircle, Clock, LogOut, Lightbulb, DollarSign, Truck, Camera } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../store'

const MENU = [
  { to:'/admin',              icon:<LayoutDashboard size={16}/>, label:'Dashboard',     group:'principal' },
  { to:'/admin/commandes',    icon:<Package size={16}/>,         label:'Commandes',     group:'principal' },
  { to:'/admin/livreurs',     icon:<Bike size={16}/>,            label:'Livreurs',      group:'principal' },
  { to:'/admin/clients',      icon:<Users size={16}/>,           label:'Clients',       group:'principal' },
  { to:'/admin/stats',        icon:<TrendingUp size={16}/>,      label:'Statistiques',  group:'principal' },
  { to:'/admin/suggestions',  icon:<Lightbulb size={16}/>,       label:'Suggestions',   group:'catalogue',  badge:'new' },
  { to:'/admin/prix',         icon:<DollarSign size={16}/>,      label:'Gestion Prix',  group:'catalogue' },
  { to:'/admin/images',       icon:<Camera size={16}/>,          label:'Photos Produits', group:'catalogue' },
  { to:'/admin/livraison',    icon:<Truck size={16}/>,           label:'Livraison',     group:'catalogue' },
]

export function AdminLayout({ children, title }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !['admin','super_admin'].includes(user?.role)) navigate('/')
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-navy min-h-screen shrink-0 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="font-serif text-white text-lg font-bold">MARCHÉ·CM</div>
          <div className="text-amber text-xs font-semibold">Administration</div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {MENU.map((m, i) => {
            const isActive = pathname === m.to || (m.to !== '/admin' && pathname.startsWith(m.to))
            const prevGroup = i > 0 ? MENU[i-1].group : m.group
            const showSep   = i > 0 && m.group !== prevGroup
            return (
              <div key={m.to}>
                {showSep && (
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest">Catalogue</p>
                  </div>
                )}
                <Link to={m.to}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors
                    ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                  {m.icon}
                  <span className="flex-1">{m.label}</span>
                  {m.badge && <span className="text-[9px] font-bold bg-amber-400 text-gray-900 px-1.5 py-0.5 rounded-full">{m.badge}</span>}
                </Link>
              </div>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 text-white/60">
            <div className="w-7 h-7 rounded-full bg-blue flex items-center justify-center text-white text-xs font-bold">
              {user?.nom_complet?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.nom_complet}</p>
              <p className="text-white/40 text-[10px]">{user?.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white text-xs w-full transition-colors mt-1">
            <LogOut size={14}/> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="font-serif text-navy text-3xl mb-6">{title}</h1>
        {children}
      </main>
    </div>
  )
}

// ── DASHBOARD ────────────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [commandes, setCommandes] = useState([])

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/commandes').then(r => setCommandes(r.data)).catch(() => {})
  }, [])

  const STATUT_COLOR = {
    livree:'text-green-600 bg-green-50', payee:'text-blue bg-blue/10',
    en_livraison:'text-amber bg-amber/10', annulee:'text-rouge bg-rouge/10',
    assignee:'text-blue bg-blue/10', en_cours_marche:'text-amber bg-amber/10',
    brouillon:'text-gray-500 bg-gray-100', en_attente_paiement:'text-gray-500 bg-gray-100',
  }

  return (
    <AdminLayout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label:'Commandes aujourd\'hui', val:stats?.commandes_aujourd_hui, icon:<ShoppingBag size={18}/>, color:'bg-blue/10 text-blue' },
          { label:'En livraison actif',     val:stats?.en_cours_livraison,    icon:<Bike size={18}/>,        color:'bg-amber/10 text-amber' },
          { label:'Livrées aujourd\'hui',   val:stats?.livrees_aujourd_hui,   icon:<CheckCircle size={18}/>, color:'bg-green-100 text-green-600' },
          { label:'CA du jour (FCFA)',       val:stats?.ca_aujourd_hui?.toLocaleString(), icon:<TrendingUp size={18}/>, color:'bg-navy/10 text-navy' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>{k.icon}</div>
            <div className="font-bold text-navy text-2xl">{k.val ?? '—'}</div>
            <div className="text-gray-400 text-xs mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-navy">Commandes récentes</h2>
          <Link to="/admin/commandes" className="text-blue text-sm hover:underline">Voir toutes</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Numéro','Client','Montant','Statut','Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commandes.slice(0, 10).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-bold text-navy">{c.numero}</td>
                  <td className="px-5 py-3 text-gray-600">{c.client_nom}</td>
                  <td className="px-5 py-3 font-semibold text-amber">{c.total_fcfa?.toLocaleString()} F</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUT_COLOR[c.statut] || 'bg-gray-100 text-gray-500'}`}>
                      {c.statut}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {commandes.length === 0 && <div className="text-center py-10 text-gray-400">Aucune commande</div>}
        </div>
      </div>
    </AdminLayout>
  )
}

