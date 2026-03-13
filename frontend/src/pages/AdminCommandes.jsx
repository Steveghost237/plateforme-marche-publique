import { useEffect, useState } from 'react'
import { Package, Search, ChevronLeft, ChevronRight, Eye, UserPlus, X, Clock, Truck, CheckCircle, XCircle, ShoppingBag, CreditCard } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'

const STATUTS = [
  { val: '', label: 'Tous' },
  { val: 'en_attente_paiement', label: 'En attente' },
  { val: 'payee', label: 'Payée' },
  { val: 'assignee', label: 'Assignée' },
  { val: 'en_cours_marche', label: 'Au marché' },
  { val: 'en_livraison', label: 'En livraison' },
  { val: 'livree', label: 'Livrée' },
  { val: 'annulee', label: 'Annulée' },
]

const STATUT_STYLE = {
  en_attente_paiement: 'bg-yellow-50 text-yellow-700',
  payee: 'bg-blue-50 text-blue-700',
  assignee: 'bg-indigo-50 text-indigo-700',
  en_cours_marche: 'bg-orange-50 text-orange-700',
  en_livraison: 'bg-cyan-50 text-cyan-700',
  livree: 'bg-green-50 text-green-700',
  annulee: 'bg-red-50 text-red-600',
  brouillon: 'bg-gray-100 text-gray-500',
}

const STATUT_ICON = {
  en_attente_paiement: <CreditCard size={14} />,
  payee: <CheckCircle size={14} />,
  assignee: <UserPlus size={14} />,
  en_cours_marche: <ShoppingBag size={14} />,
  en_livraison: <Truck size={14} />,
  livree: <CheckCircle size={14} />,
  annulee: <XCircle size={14} />,
}

export default function AdminCommandes() {
  const [commandes, setCommandes] = useState([])
  const [livreurs, setLivreurs] = useState([])
  const [filtre, setFiltre] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'detail' | 'assign', commande }

  const fetchCommandes = () => {
    setLoading(true)
    const params = new URLSearchParams({ page })
    if (filtre) params.set('statut', filtre)
    api.get(`/admin/commandes?${params}`)
      .then(r => setCommandes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCommandes() }, [filtre, page])
  useEffect(() => {
    api.get('/admin/livreurs').then(r => setLivreurs(r.data)).catch(() => {})
  }, [])

  const filtered = search
    ? commandes.filter(c =>
        c.numero?.toLowerCase().includes(search.toLowerCase()) ||
        c.client_nom?.toLowerCase().includes(search.toLowerCase())
      )
    : commandes

  const assignerLivreur = async (cmdId, livreurId) => {
    try {
      await api.put(`/admin/commandes/${cmdId}/assigner/${livreurId}`)
      setModal(null)
      fetchCommandes()
    } catch {}
  }

  const livreursDispos = livreurs.filter(l => l.statut === 'disponible' && l.est_verifie)

  // Stats rapides
  const stats = [
    { label: 'Total', val: commandes.length, icon: <Package size={18} />, color: 'bg-navy/10 text-navy' },
    { label: 'Payées', val: commandes.filter(c => c.statut === 'payee').length, icon: <CreditCard size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'En livraison', val: commandes.filter(c => c.statut === 'en_livraison').length, icon: <Truck size={18} />, color: 'bg-cyan-50 text-cyan-700' },
    { label: 'Livrées', val: commandes.filter(c => c.statut === 'livree').length, icon: <CheckCircle size={18} />, color: 'bg-green-50 text-green-600' },
  ]

  return (
    <AdminLayout title="Gestion des Commandes">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-bold text-navy text-xl">{s.val}</div>
            <div className="text-gray-400 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres + Recherche */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUTS.map(s => (
              <button key={s.val} onClick={() => { setFiltre(s.val); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filtre === s.val ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher numéro ou client..."
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
                {['Numéro', 'Client', 'Montant', 'Statut', 'Livreur', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucune commande trouvée</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-bold text-navy">{c.numero}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-700">{c.client_nom || '—'}</div>
                    <div className="text-gray-400 text-xs">{c.client_telephone || ''}</div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-amber-600">{c.total_fcfa?.toLocaleString()} F</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[c.statut] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUT_ICON[c.statut]} {c.statut?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{c.livreur_nom || <span className="text-gray-300">Non assigné</span>}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ type: 'detail', commande: c })}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Détails">
                        <Eye size={15} />
                      </button>
                      {c.statut === 'payee' && (
                        <button onClick={() => setModal({ type: 'assign', commande: c })}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Assigner livreur">
                          <UserPlus size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{filtered.length} commande(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-navy">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={commandes.length < 20}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DÉTAIL ─────────────── */}
      {modal?.type === 'detail' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">Commande {modal.commande.numero}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                ['Client', modal.commande.client_nom],
                ['Téléphone', modal.commande.client_telephone],
                ['Statut', modal.commande.statut?.replace(/_/g, ' ')],
                ['Montant', `${modal.commande.total_fcfa?.toLocaleString()} FCFA`],
                ['Sous-total', `${modal.commande.sous_total_fcfa?.toLocaleString()} FCFA`],
                ['Frais livraison', `${modal.commande.frais_livraison?.toLocaleString()} FCFA`],
                ['Créneau', modal.commande.creneau],
                ['Date livraison', modal.commande.date_livraison],
                ['Livreur', modal.commande.livreur_nom || 'Non assigné'],
                ['Créée le', modal.commande.created_at ? new Date(modal.commande.created_at).toLocaleString('fr-FR') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{k}</span>
                  <span className="font-medium text-navy text-sm">{v || '—'}</span>
                </div>
              ))}
            </div>
            {modal.commande.statut === 'payee' && (
              <div className="p-5 border-t border-gray-100">
                <button onClick={() => setModal({ type: 'assign', commande: modal.commande })}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <UserPlus size={16} /> Assigner un livreur
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ASSIGNATION ─────────── */}
      {modal?.type === 'assign' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-serif text-navy text-xl">Assigner un livreur</h2>
                <p className="text-gray-400 text-xs mt-0.5">Commande {modal.commande.numero}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-2">
              {livreursDispos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Truck size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun livreur disponible</p>
                </div>
              ) : livreursDispos.map(l => (
                <button key={l.id}
                  onClick={() => assignerLivreur(modal.commande.id, l.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
                    {l.nom_complet?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{l.nom_complet}</p>
                    <p className="text-gray-400 text-xs">{l.telephone} · ⭐ {Number(l.note_moyenne || 0).toFixed(1)} · {l.total_livraisons} livraisons</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-600 capitalize">{l.niveau}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
