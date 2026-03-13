import { useEffect, useState } from 'react'
import { Search, Users, UserCheck, UserX, ChevronLeft, ChevronRight, Eye, X, Shield, ShieldOff, Mail, Phone, Calendar } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'

export default function AdminClients() {
  const [data, setData] = useState({ total: 0, users: [] })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  const fetchClients = () => {
    setLoading(true)
    api.get(`/admin/utilisateurs?role=client&page=${page}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchClients() }, [page])

  const filtered = search
    ? data.users.filter(u =>
        u.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
        u.telephone?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : data.users

  const toggleStatut = async (userId, currentStatut) => {
    const newStatut = currentStatut === 'actif' ? 'suspendu' : 'actif'
    try {
      await api.put(`/admin/utilisateurs/${userId}/statut`, { statut: newStatut })
      fetchClients()
      if (detail) setDetail(prev => prev ? { ...prev, statut: newStatut } : null)
    } catch {}
  }

  // Stats
  const total = data.total
  const actifs = data.users.filter(u => u.statut === 'actif').length
  const suspendus = data.users.filter(u => u.statut === 'suspendu').length
  const enAttente = data.users.filter(u => u.statut === 'en_attente').length

  return (
    <AdminLayout title="Gestion des Clients">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total clients', val: total, icon: <Users size={18} />, color: 'bg-navy/10 text-navy' },
          { label: 'Actifs', val: actifs, icon: <UserCheck size={18} />, color: 'bg-green-50 text-green-600' },
          { label: 'Suspendus', val: suspendus, icon: <UserX size={18} />, color: 'bg-red-50 text-red-600' },
          { label: 'En attente', val: enAttente, icon: <Shield size={18} />, color: 'bg-yellow-50 text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-bold text-navy text-xl">{s.val}</div>
            <div className="text-gray-400 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <p className="text-gray-500 text-sm"><span className="font-bold text-navy">{total}</span> clients enregistrés</p>
          <div className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher par nom, téléphone ou email..."
              className="input pl-9 !py-2 !text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Client', 'Téléphone', 'Email', 'Statut', 'Inscrit le', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun client trouvé</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs">
                        {u.nom_complet?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-navy">{u.nom_complet}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.telephone}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{u.email || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                      ${u.statut === 'actif' ? 'bg-green-50 text-green-600' :
                        u.statut === 'suspendu' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-600'}`}>
                      {u.statut}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Détails">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => toggleStatut(u.id, u.statut)}
                        className={`p-1.5 rounded-lg transition-colors ${u.statut === 'actif'
                          ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                          : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                        title={u.statut === 'actif' ? 'Suspendre' : 'Activer'}>
                        {u.statut === 'actif' ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Page {page} · {filtered.length} affiché(s) sur {total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-navy">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={data.users.length < 20}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DÉTAIL ─────────── */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">Profil Client</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5">
              {/* Avatar + nom */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xl">
                  {detail.nom_complet?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-navy text-lg">{detail.nom_complet}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                    ${detail.statut === 'actif' ? 'bg-green-50 text-green-600' :
                      detail.statut === 'suspendu' ? 'bg-red-50 text-red-600' :
                      'bg-yellow-50 text-yellow-600'}`}>
                    {detail.statut}
                  </span>
                </div>
              </div>

              {/* Infos */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone size={16} className="text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Téléphone</div>
                    <div className="font-medium text-navy text-sm">{detail.telephone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Email</div>
                    <div className="font-medium text-navy text-sm">{detail.email || 'Non renseigné'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Inscrit le</div>
                    <div className="font-medium text-navy text-sm">
                      {new Date(detail.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button onClick={() => { toggleStatut(detail.id, detail.statut); setDetail(null) }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${detail.statut === 'actif'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                {detail.statut === 'actif'
                  ? <><UserX size={16} /> Suspendre ce client</>
                  : <><UserCheck size={16} /> Activer ce client</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
