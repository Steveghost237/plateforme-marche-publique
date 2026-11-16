import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Search, ChevronLeft, ChevronRight, Eye, UserPlus, X, Clock, Truck, CheckCircle, XCircle, ShoppingBag, CreditCard, ShoppingBasket, Store } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'
import { useConfirm } from '../components/common/useConfirm'
import Avatar from '../components/common/Avatar'

const STATUTS = [
  { val: '', label: 'Tous' },
  { val: 'prix_a_confirmer', label: 'Prix à fixer' },
  { val: 'en_attente_paiement', label: 'En attente' },
  { val: 'payee', label: 'Payée' },
  { val: 'prete', label: 'Prête' },
  { val: 'assignee', label: 'Assignée' },
  { val: 'en_cours_marche', label: 'Au marché' },
  { val: 'en_livraison', label: 'En livraison' },
  { val: 'livree', label: 'Livrée' },
  { val: 'annulee', label: 'Annulée' },
]

const STATUT_STYLE = {
  prix_a_confirmer: 'bg-purple-50 text-purple-700',
  en_attente_paiement: 'bg-yellow-50 text-yellow-700',
  payee: 'bg-blue-50 text-blue-700',
  prete: 'bg-emerald-50 text-emerald-700',
  assignee: 'bg-indigo-50 text-indigo-700',
  en_cours_marche: 'bg-orange-50 text-orange-700',
  en_livraison: 'bg-cyan-50 text-cyan-700',
  livree: 'bg-green-50 text-green-700',
  annulee: 'bg-red-50 text-red-600',
  brouillon: 'bg-gray-100 text-gray-500',
}

const STATUT_LABEL = {
  prix_a_confirmer: 'prix à fixer',
  en_attente_paiement: 'en attente paiement', payee: 'payée', prete: 'prête',
  assignee: 'assignée', en_cours_marche: 'au marché', en_livraison: 'en livraison',
  livree: 'livrée', annulee: 'annulée', brouillon: 'brouillon',
}

const STATUT_ICON = {
  prix_a_confirmer: <Package size={14} />,
  en_attente_paiement: <CreditCard size={14} />,
  payee: <CheckCircle size={14} />,
  prete: <ShoppingBasket size={14} />,
  assignee: <UserPlus size={14} />,
  en_cours_marche: <ShoppingBag size={14} />,
  en_livraison: <Truck size={14} />,
  livree: <CheckCircle size={14} />,
  annulee: <XCircle size={14} />,
}

export default function AdminCommandes() {
  const [commandes, setCommandes] = useState([])
  const [livreurs, setLivreurs] = useState([])
  const [sp] = useSearchParams()
  const [filtre, setFiltre] = useState(sp.get('statut') || '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'detail' | 'assign', commande }
  const [detailFull, setDetailFull] = useState(null)
  const [detailErreur, setDetailErreur] = useState(null)
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchCommandes = () => {
    setLoading(true)
    setErreur('')
    const params = new URLSearchParams({ page })
    if (filtre) params.set('statut', filtre)
    api.get(`/admin/commandes?${params}`)
      .then(r => setCommandes(r.data))
      .catch(e => setErreur(e?.response?.data?.detail || 'Erreur de chargement des commandes'))
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
    } catch (e) {
      setErreur(e?.response?.data?.detail || 'Erreur lors de l\'assignation')
    }
  }

  const ouvrirDetail = (c) => {
    setModal({ type: 'detail', commande: c })
    setDetailFull(null); setDetailErreur(null)
    api.get(`/admin/commandes/${c.id}`).then(r => setDetailFull(r.data))
      .catch(e => setDetailErreur(e?.response?.status === 404
        ? "Cette commande relève d'un autre marché."
        : (e?.response?.data?.detail || 'Impossible de charger le détail')))
  }

  const marquerPrete = async (c) => {
    if (!await confirm({
      titre: 'Commande prête ?',
      message: `Confirmer que la commande ${c.numero} est préparée ? Les livreurs disponibles, les administrateurs et le client seront alertés.`,
      confirmLabel: 'Marquer prête',
    })) return
    try {
      const r = await api.post(`/admin/commandes/${c.id}/prete`)
      setOk(r.data?.message || 'Commande marquée prête')
      fetchCommandes()
    } catch (e) {
      setErreur(e?.response?.data?.detail || 'Erreur')
    }
  }

  // ── Fixer les prix « au marché » (Ma Liste) ──
  const [prixModal, setPrixModal] = useState(null) // {commande, detail, saisie:{ligneId:prix}, saving}
  const ouvrirPrix = (c) => {
    setPrixModal({ commande: c, detail: null, saisie: {}, saving: false, erreur: null })
    api.get(`/admin/commandes/${c.id}`)
      .then(r => setPrixModal(m => m && ({ ...m, detail: r.data })))
      .catch(e => setPrixModal(m => m && ({ ...m, erreur: e?.response?.status === 404
        ? "Cette commande relève d'un autre marché — seul l'agent de ce point d'achat peut fixer les prix."
        : (e?.response?.data?.detail || 'Impossible de charger la commande') })))
  }
  const confirmerPrix = async () => {
    const aFixer = (prixModal.detail?.lignes || []).filter(l => (l.prix_unitaire || 0) <= 0)
    const prix = {}
    for (const l of aFixer) {
      const v = parseInt(prixModal.saisie[l.id])
      if (!v || v <= 0) { setErreur(`Prix manquant pour « ${l.note || l.nom} »`); return }
      prix[l.id] = v
    }
    setPrixModal(m => ({ ...m, saving: true })); setErreur('')
    try {
      const r = await api.put(`/admin/commandes/${prixModal.commande.id}/confirmer-prix`, { prix })
      setPrixModal(null)
      setOk(`Prix confirmés — nouveau total : ${r.data.total_fcfa?.toLocaleString()} F. Le client est notifié et peut payer.`)
      fetchCommandes()
    } catch (e) {
      setErreur(e?.response?.data?.detail || 'Erreur')
      setPrixModal(m => m && ({ ...m, saving: false }))
    }
  }

  // Tout livreur vérifié est assignable (un "hors ligne" recevra la notif à sa connexion).
  // Tri : disponibles d'abord, hors ligne ensuite, occupés en dernier (désactivés).
  const ORDRE_STATUT = { disponible: 0, hors_ligne: 1, occupe: 2 }
  const livreursAssignables = livreurs
    .filter(l => l.est_verifie)
    .sort((a, b) => (ORDRE_STATUT[a.statut] ?? 3) - (ORDRE_STATUT[b.statut] ?? 3))

  // Stats rapides
  const stats = [
    { label: 'Total', val: commandes.length, icon: <Package size={18} />, color: 'bg-navy/10 text-navy' },
    { label: 'Payées', val: commandes.filter(c => c.statut === 'payee').length, icon: <CreditCard size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'En livraison', val: commandes.filter(c => c.statut === 'en_livraison').length, icon: <Truck size={18} />, color: 'bg-cyan-50 text-cyan-700' },
    { label: 'Livrées', val: commandes.filter(c => c.statut === 'livree').length, icon: <CheckCircle size={18} />, color: 'bg-green-50 text-green-600' },
  ]

  return (
    <AdminLayout title="Gestion des Commandes">
      {ConfirmDialog}
      {ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between items-center">
          {ok}
          <button onClick={() => setOk('')} className="font-bold ml-4">&times;</button>
        </div>
      )}
      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between items-center">
          {erreur}
          <button onClick={() => setErreur('')} className="text-red-400 hover:text-red-600 font-bold ml-4">&times;</button>
        </div>
      )}
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
                      {STATUT_ICON[c.statut]} {STATUT_LABEL[c.statut] || c.statut?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{c.livreur_nom || <span className="text-gray-300">Non assigné</span>}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => ouvrirDetail(c)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Détails">
                        <Eye size={15} />
                      </button>
                      {c.statut === 'prix_a_confirmer' && (
                        <button onClick={() => ouvrirPrix(c)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors" title="Fixer les prix du marché">
                          <Store size={15} />
                        </button>
                      )}
                      {c.statut === 'payee' && (
                        <button onClick={() => marquerPrete(c)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Marquer prête (commande préparée)">
                          <ShoppingBasket size={15} />
                        </button>
                      )}
                      {['payee','prete'].includes(c.statut) && (
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

      {/* ── MODAL FIXER LES PRIX ─────────────── */}
      {prixModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !prixModal.saving && setPrixModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-serif text-navy text-xl">Fixer les prix — {prixModal.commande.numero}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Vrais prix constatés au marché — le client paiera ensuite</p>
              </div>
              <button onClick={() => setPrixModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
              {prixModal.erreur ? (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  ⛔ {prixModal.erreur}
                </div>
              ) : !prixModal.detail ? <p className="text-center text-gray-400 py-6 text-sm">Chargement…</p> : (
                <>
                  {(prixModal.detail.lignes || []).map(l => {
                    const aFixer = (l.prix_unitaire || 0) <= 0
                    return (
                      <div key={l.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${aFixer ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy truncate">{l.note || l.nom}</p>
                          <p className="text-[10px] text-gray-400">×{l.quantite}</p>
                        </div>
                        {aFixer ? (
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="1" placeholder="Prix réel"
                              value={prixModal.saisie[l.id] || ''}
                              onChange={e => setPrixModal(m => ({ ...m, saisie: { ...m.saisie, [l.id]: e.target.value } }))}
                              className="w-24 border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-300"/>
                            <span className="text-xs text-gray-400">F</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">{l.prix_unitaire?.toLocaleString()} F</span>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-bold text-navy pt-2 border-t border-gray-100">
                    <span>Nouveau total (hors livraison)</span>
                    <span>{(
                      (prixModal.detail.lignes || []).reduce((a, l) =>
                        a + ((l.prix_unitaire || 0) > 0 ? l.prix_unitaire * l.quantite
                             : (parseInt(prixModal.saisie[l.id]) || 0) * l.quantite), 0)
                    ).toLocaleString()} F</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setPrixModal(null)} disabled={prixModal.saving}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={confirmerPrix} disabled={prixModal.saving || !prixModal.detail || prixModal.erreur}
                className="flex-1 bg-purple-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50">
                {prixModal.saving ? 'Confirmation…' : 'Confirmer les prix'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                ['Tél. secours', modal.commande.client_telephone2],
                ['Statut', STATUT_LABEL[modal.commande.statut] || modal.commande.statut?.replace(/_/g, ' ')],
                ['Marché', detailFull ? `${detailFull.point_achat_nom || '—'}${detailFull.point_achat_ville ? ` (${detailFull.point_achat_ville})` : ''}` : modal.commande.point_achat_nom],
                ['Adresse', detailFull ? [detailFull.adresse_quartier, detailFull.adresse_ville].filter(Boolean).join(', ') : null],
                ['Montant', `${modal.commande.total_fcfa?.toLocaleString()} FCFA`],
                ['Sous-total', `${modal.commande.sous_total_fcfa?.toLocaleString()} FCFA`],
                ['Frais livraison', `${modal.commande.frais_livraison?.toLocaleString()} FCFA`],
                ['Créneau', modal.commande.creneau],
                ['Date livraison', modal.commande.date_livraison],
                ['Livreur', modal.commande.livreur_nom || 'Non assigné'],
                ['Préparée par', detailFull?.preparee_par_nom],
                ['Note client', detailFull?.note_client],
                ['Créée le', modal.commande.created_at ? new Date(modal.commande.created_at).toLocaleString('fr-FR') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{k}</span>
                  <span className="font-medium text-navy text-sm text-right">{v || '—'}</span>
                </div>
              ))}

              {/* Produits */}
              {detailErreur && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  ⛔ {detailErreur}
                </div>
              )}
              {detailFull?.lignes?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2 flex items-center gap-1.5"><ShoppingBag size={13} /> Produits à préparer</p>
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    {detailFull.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                        <span className="text-navy font-medium">
                          {l.note || l.nom}
                          {l.note && l.nom !== l.note && <span className="text-gray-400 font-normal"> ({l.nom})</span>}
                          <span className="text-gray-400 font-normal"> × {l.quantite}{l.unite ? ` ${l.unite}` : ''}</span>
                        </span>
                        <span className="text-amber-600 font-semibold">
                          {(l.prix_unitaire || 0) <= 0 ? 'au marché' : `${l.prix_total?.toLocaleString()} F`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {['payee','prete'].includes(modal.commande.statut) && (
              <div className="p-5 border-t border-gray-100 space-y-2">
                {modal.commande.statut === 'payee' && (
                  <button onClick={() => { marquerPrete(modal.commande); setModal(null) }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <ShoppingBasket size={16} /> Marquer prête (commande préparée)
                  </button>
                )}
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
              {livreursAssignables.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Truck size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun livreur vérifié</p>
                </div>
              ) : livreursAssignables.map(l => {
                const missions = l.missions_actives || 0
                return (
                <button key={l.id}
                  onClick={() => assignerLivreur(modal.commande.id, l.id)}
                  title={l.statut === 'hors_ligne' ? 'Hors ligne — sera notifié à sa connexion' : missions > 0 ? `${missions} course(s) en cours — peut en cumuler` : 'Disponible'}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors text-left">
                  <Avatar user={l} size="md" bg="bg-navy/10" text="text-navy"/>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{l.nom_complet}</p>
                    <p className="text-gray-400 text-xs">{l.telephone} · ⭐ {Number(l.note_moyenne || 0).toFixed(1)} · {l.total_livraisons} livraisons</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l.statut === 'hors_ligne' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'}`}>
                      {l.statut === 'hors_ligne' ? '○ hors ligne' : '● en ligne'}
                    </span>
                    {missions > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        {missions} course{missions > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
