import { useEffect, useState, useCallback } from 'react'
import {
  Monitor, Smartphone, Users, Globe, Activity, ShoppingBag, Package,
  TrendingUp, UserPlus, RefreshCw, Wifi, WifiOff, ChevronRight,
  Search, Filter, Clock, Eye, Shield, Bike, ChevronLeft
} from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'

const ROLE_LABELS = { client: 'Client', livreur: 'Livreur', admin: 'Admin', super_admin: 'Super Admin' }
const ROLE_COLORS = {
  client: 'bg-blue-50 text-blue-600',
  livreur: 'bg-amber-50 text-amber-600',
  admin: 'bg-purple-50 text-purple-600',
  super_admin: 'bg-red-50 text-red-600',
}

function timeAgo(iso) {
  if (!iso) return 'Jamais'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return `Il y a ${Math.floor(diff / 86400)}j`
}

export default function AdminMonitoring() {
  const [data, setData] = useState(null)
  const [users, setUsers] = useState({ total: 0, users: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState({ plateforme: '', role: '', en_ligne: '' })
  const [page, setPage] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const [monitoring, usersList] = await Promise.all([
        api.get('/admin/monitoring'),
        api.get('/admin/monitoring/utilisateurs', {
          params: {
            ...(filter.plateforme && { plateforme: filter.plateforme }),
            ...(filter.role && { role: filter.role }),
            ...(filter.en_ligne !== '' && { en_ligne: filter.en_ligne === 'true' }),
            page,
          }
        }),
      ])
      setData(monitoring.data)
      setUsers(usersList.data)
    } catch (e) {
      console.error('Erreur monitoring:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, page])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data: d } = await api.get('/admin/monitoring/utilisateurs', {
        params: {
          ...(filter.plateforme && { plateforme: filter.plateforme }),
          ...(filter.role && { role: filter.role }),
          ...(filter.en_ligne !== '' && { en_ligne: filter.en_ligne === 'true' }),
          page,
        }
      })
      setUsers(d)
    } catch (e) { console.error(e) }
    finally { setUsersLoading(false) }
  }, [filter, page])

  useEffect(() => { if (!loading) fetchUsers() }, [filter, page])

  if (loading) return (
    <AdminLayout title="Monitoring">
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    </AdminLayout>
  )

  const m = data
  const pf = m?.plateformes || {}
  const u = m?.utilisateurs || {}
  const cmd = m?.commandes || {}
  const cat = m?.catalogue || {}

  return (
    <AdminLayout title="Monitoring">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Mise à jour automatique toutes les 30s</p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ═══ PLATEFORMES EN TEMPS RÉEL ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Web */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Monitor size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-lg">Site Web</h3>
                <p className="text-gray-400 text-xs">Application React</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${pf.web?.en_ligne > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-xs font-medium text-gray-500">
                {pf.web?.en_ligne > 0 ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-3 border border-blue-50">
              <div className="flex items-center gap-2 mb-1">
                <Wifi size={14} className="text-green-500" />
                <span className="text-[10px] text-gray-400 uppercase font-bold">En ligne</span>
              </div>
              <div className="text-2xl font-bold text-navy">{pf.web?.en_ligne ?? 0}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-50">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-blue-500" />
                <span className="text-[10px] text-gray-400 uppercase font-bold">Actifs 24h</span>
              </div>
              <div className="text-2xl font-bold text-navy">{pf.web?.actifs_24h ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Smartphone size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-lg">Application Mobile</h3>
                <p className="text-gray-400 text-xs">APK Flutter</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${pf.mobile?.en_ligne > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-xs font-medium text-gray-500">
                {pf.mobile?.en_ligne > 0 ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-3 border border-amber-50">
              <div className="flex items-center gap-2 mb-1">
                <Wifi size={14} className="text-green-500" />
                <span className="text-[10px] text-gray-400 uppercase font-bold">En ligne</span>
              </div>
              <div className="text-2xl font-bold text-navy">{pf.mobile?.en_ligne ?? 0}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-amber-50">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] text-gray-400 uppercase font-bold">Actifs 24h</span>
              </div>
              <div className="text-2xl font-bold text-navy">{pf.mobile?.actifs_24h ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPIs GLOBAUX ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Utilisateurs', val: u.total, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'En ligne maintenant', val: u.en_ligne, icon: <Wifi size={18} />, color: 'bg-green-50 text-green-600' },
          { label: 'Actifs (24h)', val: u.actifs_24h, icon: <Activity size={18} />, color: 'bg-purple-50 text-purple-600' },
          { label: 'Inscrits aujourd\'hui', val: u.inscrits_aujourd_hui, icon: <UserPlus size={18} />, color: 'bg-amber-50 text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>{k.icon}</div>
            <div className="font-bold text-navy text-2xl">{k.val ?? 0}</div>
            <div className="text-gray-400 text-xs mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Commandes du jour', val: cmd.aujourd_hui, icon: <ShoppingBag size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'CA du jour', val: `${(cmd.ca_aujourd_hui || 0).toLocaleString()} F`, icon: <TrendingUp size={18} />, color: 'bg-green-50 text-green-600' },
          { label: 'En cours', val: cmd.en_cours, icon: <Package size={18} />, color: 'bg-amber-50 text-amber-600' },
          { label: 'Produits actifs', val: cat.total_produits, icon: <Eye size={18} />, color: 'bg-navy/10 text-navy' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>{k.icon}</div>
            <div className="font-bold text-navy text-2xl">{k.val ?? 0}</div>
            <div className="text-gray-400 text-xs mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ RÉPARTITION UTILISATEURS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <Users size={16} /> Répartition par rôle
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Clients', val: u.clients, color: 'bg-blue-500', icon: <Users size={14} /> },
              { label: 'Livreurs', val: u.livreurs, color: 'bg-amber-500', icon: <Bike size={14} /> },
              { label: 'Admins', val: u.admins, color: 'bg-purple-500', icon: <Shield size={14} /> },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <div className={`w-8 h-8 ${r.color} rounded-lg flex items-center justify-center text-white`}>{r.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{r.label}</span>
                    <span className="font-bold text-navy">{r.val ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className={`h-1.5 rounded-full ${r.color} transition-all`}
                      style={{ width: `${u.total > 0 ? ((r.val || 0) / u.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <Globe size={16} /> Répartition par plateforme
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Monitor size={28} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-navy">{pf.web?.actifs_24h ?? 0}</div>
              <div className="text-[10px] text-gray-400 font-medium uppercase">Web</div>
            </div>
            <div className="text-gray-300 text-2xl font-light">vs</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Smartphone size={28} className="text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-navy">{pf.mobile?.actifs_24h ?? 0}</div>
              <div className="text-[10px] text-gray-400 font-medium uppercase">Mobile</div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
            {(pf.web?.actifs_24h || 0) + (pf.mobile?.actifs_24h || 0) > 0 ? (<>
              <div className="bg-blue-500 h-full transition-all"
                style={{ width: `${((pf.web?.actifs_24h || 0) / ((pf.web?.actifs_24h || 0) + (pf.mobile?.actifs_24h || 0))) * 100}%` }} />
              <div className="bg-amber-500 h-full transition-all"
                style={{ width: `${((pf.mobile?.actifs_24h || 0) / ((pf.web?.actifs_24h || 0) + (pf.mobile?.actifs_24h || 0))) * 100}%` }} />
            </>) : <div className="bg-gray-200 h-full w-full" />}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
            <span>Web {pf.web?.actifs_24h ?? 0}</span>
            <span>Mobile {pf.mobile?.actifs_24h ?? 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <Activity size={16} /> Inscriptions
          </h3>
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{u.inscrits_aujourd_hui ?? 0}</div>
              <div className="text-xs text-green-600/70 font-medium">Aujourd'hui</div>
            </div>
            <div className="bg-navy/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-navy">{u.inscrits_mois ?? 0}</div>
              <div className="text-xs text-navy/50 font-medium">Ce mois</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ UTILISATEURS RÉCENTS + LISTE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activité récente */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <Clock size={16} /> Dernières connexions
            </h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {(m?.utilisateurs_recents || []).map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold
                    ${u.role === 'admin' || u.role === 'super_admin' ? 'bg-purple-500' : u.role === 'livreur' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    {u.nom_complet?.[0] || '?'}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white
                    ${u.en_ligne ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy truncate">{u.nom_complet}</span>
                    {u.plateforme === 'web' && <Monitor size={12} className="text-blue-400 shrink-0" />}
                    {u.plateforme === 'mobile' && <Smartphone size={12} className="text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-gray-400">{timeAgo(u.derniere_connexion)}</div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-500'}`}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Liste complète filtrée */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy flex items-center gap-2">
                <Users size={16} /> Tous les utilisateurs
                <span className="text-xs font-normal text-gray-400">({users.total})</span>
              </h3>
            </div>
            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <select value={filter.plateforme} onChange={e => { setFilter(f => ({...f, plateforme: e.target.value})); setPage(1) }}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-navy">
                <option value="">Toutes plateformes</option>
                <option value="web">🖥️ Web</option>
                <option value="mobile">📱 Mobile</option>
              </select>
              <select value={filter.role} onChange={e => { setFilter(f => ({...f, role: e.target.value})); setPage(1) }}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-navy">
                <option value="">Tous rôles</option>
                <option value="client">Client</option>
                <option value="livreur">Livreur</option>
                <option value="admin">Admin</option>
              </select>
              <select value={filter.en_ligne} onChange={e => { setFilter(f => ({...f, en_ligne: e.target.value})); setPage(1) }}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-navy">
                <option value="">Tous statuts</option>
                <option value="true">🟢 En ligne</option>
                <option value="false">⚪ Hors ligne</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Utilisateur', 'Rôle', 'Plateforme', 'Statut', 'Dernière connexion'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Chargement...</td></tr>
                ) : users.users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun utilisateur trouvé</td></tr>
                ) : users.users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                            ${u.role === 'admin' || u.role === 'super_admin' ? 'bg-purple-500' : u.role === 'livreur' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                            {u.nom_complet?.[0] || '?'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white
                            ${u.en_ligne ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                        <div>
                          <div className="font-medium text-navy text-sm">{u.nom_complet}</div>
                          <div className="text-[10px] text-gray-400">{u.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.plateforme === 'web' && <><Monitor size={13} className="text-blue-500" /> <span className="text-xs text-gray-600">Web</span></>}
                        {u.plateforme === 'mobile' && <><Smartphone size={13} className="text-amber-500" /> <span className="text-xs text-gray-600">Mobile</span></>}
                        {u.plateforme !== 'web' && u.plateforme !== 'mobile' && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.en_ligne ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En ligne
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <div className="w-2 h-2 bg-gray-300 rounded-full" /> Hors ligne
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(u.derniere_connexion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {users.total > 20 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Page {page} sur {Math.ceil(users.total / 20)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 flex items-center gap-1">
                  <ChevronLeft size={12} /> Préc.
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(users.total / 20)}
                  className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs hover:bg-navy/90 disabled:opacity-30 flex items-center gap-1">
                  Suiv. <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
