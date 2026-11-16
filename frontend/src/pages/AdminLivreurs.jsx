import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Bike, Shield, ShieldOff, Star, TrendingUp, Eye, X, MapPin, Plus, Pencil, Trash2, Phone, Mail, UserX, UserCheck } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'
import { useConfirm } from '../components/common/useConfirm'
import { useAuth } from '../store'

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

const NIVEAU_LABEL = { junior: 'Junior', senior: 'Sénior', expert: 'Expert', elite: 'Élite' }

const VIDE = { nom_complet: '', telephone: '', email: '', mot_de_passe: '',
               type_vehicule: 'moto', plaque: '', numero_permis: '', zone_couverte: '' }

export default function AdminLivreurs() {
  const { user } = useAuth()
  const isAgent = user?.role === 'agent'
  const [livreurs, setLivreurs] = useState([])
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const [modal, setModal] = useState(null) // null | { mode:'create'|'edit', data }
  const [saving, setSaving] = useState(false)

  const fetchLivreurs = () => {
    setLoading(true)
    api.get('/admin/livreurs', { params: search ? { q: search } : {} })
      .then(r => setLivreurs(r.data))
      .catch(e => setErreur(e?.response?.data?.detail || 'Erreur de chargement des livreurs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLivreurs() }, [])
  useEffect(() => { const t = setTimeout(fetchLivreurs, 300); return () => clearTimeout(t) }, [search])

  const filtered = livreurs.filter(l => {
    const matchSearch = !search || 
      l.nom_complet?.toLowerCase().includes(search.toLowerCase()) ||
      l.telephone?.toLowerCase().includes(search.toLowerCase())
    const matchStatut = !filtreStatut || l.statut === filtreStatut
    return matchSearch && matchStatut
  })

  const { confirm, ConfirmDialog } = useConfirm()

  const toggleVerif = async (livreurId) => {
    if (!await confirm({ titre: 'Modifier la vérification ?', message: 'Le statut "vérifié" de ce livreur sera basculé.', confirmLabel: 'Confirmer' })) return
    try {
      await api.put(`/admin/livreurs/${livreurId}/verifier`)
      fetchLivreurs()
    } catch (e) {
      setErreur(e?.response?.data?.detail || 'Erreur lors de la vérification')
    }
  }

  const ouvrirEdit = (l) => setModal({ mode: 'edit', data: {
    id: l.id, nom_complet: l.nom_complet || '', telephone: l.telephone || '',
    email: l.email || '', mot_de_passe: '',
    type_vehicule: l.type_vehicule || 'moto', plaque: l.plaque || '',
    numero_permis: l.numero_permis || '', zone_couverte: l.zone_couverte || '',
  }})

  const sauver = async (e) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    try {
      const d = modal.data
      const payload = {
        nom_complet: d.nom_complet, email: d.email || null,
        type_vehicule: d.type_vehicule, plaque: d.plaque || null,
        numero_permis: d.numero_permis || null, zone_couverte: d.zone_couverte || null,
      }
      if (d.mot_de_passe) payload.mot_de_passe = d.mot_de_passe
      if (modal.mode === 'create') {
        if (!d.mot_de_passe) { setErreur('Mot de passe requis'); setSaving(false); return }
        payload.telephone = d.telephone
        payload.mot_de_passe = d.mot_de_passe
        await api.post('/admin/livreurs', payload)
        setOk('Livreur créé — identifiants envoyés par email si renseigné')
      } else {
        await api.put(`/admin/livreurs/${d.id}`, payload)
        setOk('Livreur mis à jour')
      }
      setModal(null); fetchLivreurs()
    } catch (e2) {
      setErreur(e2?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally { setSaving(false) }
  }

  const suspendre = async (l) => {
    const suspendu = l.statut_compte === 'suspendu'
    if (!await confirm({
      titre: suspendu ? 'Réactiver ce livreur ?' : 'Suspendre ce livreur ?',
      message: suspendu
        ? `${l.nom_complet} pourra à nouveau se connecter et reprendre des courses.`
        : `${l.nom_complet} ne pourra plus se connecter ni recevoir de missions. Il sera mis hors ligne.`,
      confirmLabel: suspendu ? 'Réactiver' : 'Suspendre', danger: !suspendu,
    })) return
    try {
      await api.put(`/admin/livreurs/${l.id}`, { statut_compte: suspendu ? 'actif' : 'suspendu' })
      setOk(suspendu ? 'Livreur réactivé' : 'Livreur suspendu et mis hors ligne')
      fetchLivreurs()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur') }
  }

  const supprimer = async (l) => {
    if (!await confirm({
      titre: 'Supprimer ce livreur ?',
      message: `${l.nom_complet} (${l.telephone}) ne pourra plus se connecter ni recevoir de missions.`,
      confirmLabel: 'Supprimer', danger: true,
    })) return
    try {
      await api.delete(`/admin/livreurs/${l.id}`)
      setOk('Livreur supprimé'); fetchLivreurs()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur de suppression') }
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
      {ConfirmDialog}
      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between items-center">
          {erreur}
          <button onClick={() => setErreur('')} className="text-red-400 hover:text-red-600 font-bold ml-4">&times;</button>
        </div>
      )}
      {ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between items-center">
          {ok}
          <button onClick={() => setOk('')} className="font-bold ml-4">&times;</button>
        </div>
      )}
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
          <div className="flex gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher nom, téléphone, plaque, zone..."
                className="input pl-9 !py-2 !text-xs w-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setModal({ mode: 'create', data: { ...VIDE } })}
              className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue transition-colors shrink-0">
              <Plus size={16} /> Nouveau livreur
            </button>
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
                        <div className="font-semibold text-navy text-sm">{l.nom_complet}
                          {l.statut_compte === 'suspendu' && (
                            <span className="ml-2 text-[9px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full align-middle">SUSPENDU</span>
                          )}
                        </div>
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
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(l)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Voir détails">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => ouvrirEdit(l)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy transition-colors" title="Modifier">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => suspendre(l)}
                        className={`p-1.5 rounded-lg transition-colors ${l.statut_compte === 'suspendu'
                          ? 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                          : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'}`}
                        title={l.statut_compte === 'suspendu' ? 'Réactiver' : 'Suspendre'}>
                        {l.statut_compte === 'suspendu' ? <UserCheck size={15} /> : <UserX size={15} />}
                      </button>
                      <button onClick={() => supprimer(l)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </div>
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
                <button onClick={() => { ouvrirEdit(detail); setDetail(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-blue transition-colors">
                  <Pencil size={16} /> Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREATE / EDIT ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">{modal.mode === 'create' ? 'Nouveau livreur' : 'Modifier le livreur'}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={sauver} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom complet *</label>
                <input required className="input" value={modal.data.nom_complet}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, nom_complet: e.target.value } }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Téléphone *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required disabled={modal.mode === 'edit'} className="input pl-9 disabled:opacity-50"
                    value={modal.data.telephone} placeholder="+2376XXXXXXXX"
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, telephone: e.target.value } }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email (reçoit les identifiants de connexion)</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" className="input pl-9" value={modal.data.email || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Véhicule</label>
                  <select className="input" value={modal.data.type_vehicule}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, type_vehicule: e.target.value } }))}>
                    <option value="moto">Moto</option>
                    <option value="velo">Vélo</option>
                    <option value="voiture">Voiture</option>
                    <option value="pied">À pied</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Plaque</label>
                  <input className="input" placeholder="CE-123-AB" value={modal.data.plaque || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, plaque: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">N° permis</label>
                  <input className="input" value={modal.data.numero_permis || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, numero_permis: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Zone couverte</label>
                  <input className="input" placeholder="Douala - Deïdo" value={modal.data.zone_couverte || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, zone_couverte: e.target.value } }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {modal.mode === 'create' ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide = inchangé)'}
                </label>
                <input type="text" required={modal.mode === 'create'} className="input"
                  placeholder="Min. 8 car., maj., chiffre, spécial" value={modal.data.mot_de_passe}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, mot_de_passe: e.target.value } }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-blue disabled:opacity-50">
                  {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer le livreur' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
