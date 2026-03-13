import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Bike, Shield, ShieldOff, Star, TrendingUp, Eye, X, MapPin } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'

const STATUT_STYLE = {
  disponible: 'bg-green-50 text-green-600',
  occupe: 'bg-amber-50 text-amber-700',
  hors_ligne: 'bg-gray-100 text-gray-400',
  en_pause: 'bg-blue-50 text-blue-600',
}

const NIVEAU_STYLE = {
  junior: 'bg-gray-100 text-gray-600',
  senior: 'bg-blue-50 text-blue-700',
  expert: 'bg-amber-50 text-amber-700',
  elite: 'bg-purple-50 text-purple-600',
}

const NIVEAU_LABEL = { junior: '🥉 Junior', senior: '🥈 Sénior', expert: '🥇 Expert', elite: '💎 Élite' }

export default function AdminLivreurs() {
  const [livreurs, setLivreurs] = useState([])
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  const fetchLivreurs = () => {
    setLoading(true)
    api.get('/admin/livreurs')
      .then(r => setLivreurs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLivreurs() }, [])

  const filtered = livreurs.filter(l => {
    const matchSearch = !search || 
      l.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
      l.telephone?.toLowerCase().includes(search.toLowerCase())
    const matchStatut = !filtreStatut || l.statut === filtreStatut
    return matchSearch && matchStatut
  })

  const toggleVerif = async (livreurId) => {
    try {
      await api.put(`/admin/livreurs/${livreurId}/verifier`)
      fetchLivreurs()
    } catch {}
  }

  // Stats
  const total = livreurs.length
  const dispos = livreurs.filter(l => l.statut === 'disponible').length
  const occupes = livreurs.filter(l => l.statut === 'occupe').length
  const hors = livreurs.filter(l => l.statut === 'hors_ligne').length
  const verifies = livreurs.filter(l => l.est_verifie).length
  const noteMoy = livreurs.length > 0 ? (livreurs.reduce((a, l) => a + Number(l.note_moyenne || 0), 0) / livreurs.length).toFixed(1) : '0.0'

  return (
    <AdminLayout title="Gestion des Livreurs">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', val: total, color: 'bg-navy/10 text-navy', icon: <Bike size={18} /> },
          { label: 'Disponibles', val: dispos, color: 'bg-green-50 text-green-600', icon: <CheckCircle size={18} /> },
          { label: 'Occupés', val: occupes, color: 'bg-amber-50 text-amber-700', icon: <TrendingUp size={18} /> },
          { label: 'Hors ligne', val: hors, color: 'bg-gray-100 text-gray-500', icon: <XCircle size={18} /> },
          { label: 'Vérifiés', val: `${verifies}/${total}`, color: 'bg-blue-50 text-blue-700', icon: <Shield size={18} /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-bold text-navy text-xl">{s.val}</div>
            <div className="text-gray-400 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { val: '', label: 'Tous' },
              { val: 'disponible', label: 'Disponibles' },
              { val: 'occupe', label: 'Occupés' },
              { val: 'hors_ligne', label: 'Hors ligne' },
            ].map(s => (
              <button key={s.val} onClick={() => setFiltreStatut(s.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filtreStatut === s.val ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher par nom ou téléphone..."
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
                {['Livreur', 'Niveau', 'Note', 'Livraisons', 'Gains', 'Statut', 'Vérifié', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Aucun livreur trouvé</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs">
                        {l.nom_complet?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-navy text-sm">{l.nom_complet}</div>
                        <div className="text-gray-400 text-xs">{l.telephone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${NIVEAU_STYLE[l.niveau] || 'bg-gray-100 text-gray-500'}`}>
                      {NIVEAU_LABEL[l.niveau] || l.niveau}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-sm">{Number(l.note_moyenne || 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-600">{l.total_livraisons || 0}</td>
                  <td className="px-5 py-3 font-semibold text-amber-600">{(l.total_gains_fcfa || 0).toLocaleString()} F</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUT_STYLE[l.statut] || 'bg-gray-100 text-gray-400'}`}>
                      {l.statut?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleVerif(l.id)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer
                        ${l.est_verifie ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-400 hover:bg-red-100'}`}>
                      {l.est_verifie ? <><Shield size={12} /> Vérifié</> : <><ShieldOff size={12} /> Non vérifié</>}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => setDetail(l)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Voir détails">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} livreur(s) · Note moyenne globale : ⭐ {noteMoy}
        </div>
      </div>

      {/* ── MODAL DÉTAIL ─────────── */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">Profil Livreur</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xl">
                  {detail.nom_complet?.[0]}
                </div>
                <div>
                  <h3 className="font-bold text-navy text-lg">{detail.nom_complet}</h3>
                  <p className="text-gray-400 text-sm">{detail.telephone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Niveau', NIVEAU_LABEL[detail.niveau] || detail.niveau],
                  ['Statut', detail.statut?.replace('_', ' ')],
                  ['Note', `⭐ ${Number(detail.note_moyenne || 0).toFixed(1)}`],
                  ['Livraisons', detail.total_livraisons || 0],
                  ['Gains', `${(detail.total_gains_fcfa || 0).toLocaleString()} FCFA`],
                  ['Véhicule', detail.type_vehicule || '—'],
                  ['Plaque', detail.plaque || '—'],
                  ['Zone', detail.zone_couverte || '—'],
                  ['Vérifié', detail.est_verifie ? '✅ Oui' : '❌ Non'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-gray-400 text-xs mb-0.5">{k}</div>
                    <div className="font-semibold text-navy text-sm capitalize">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { toggleVerif(detail.id); setDetail(null) }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
                    ${detail.est_verifie ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  {detail.est_verifie ? <><ShieldOff size={16} /> Retirer vérification</> : <><Shield size={16} /> Vérifier</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
