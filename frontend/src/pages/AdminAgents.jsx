import { useEffect, useState } from 'react'
import { Search, UserCog, Plus, Pencil, Trash2, X, Store, Phone, Mail } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'
import { useConfirm } from '../components/common/useConfirm'

const VIDE = { nom_complet: '', telephone: '', email: '', mot_de_passe: '', point_achat_id: '' }

export default function AdminAgents() {
  const [agents, setAgents] = useState([])
  const [pointsAchat, setPointsAchat] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const [modal, setModal] = useState(null) // null | { mode:'create'|'edit', data }
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/agents', { params: search ? { q: search } : {} }),
      api.get('/admin/points-achat'),
    ]).then(([a, p]) => { setAgents(a.data); setPointsAchat(p.data) })
      .catch(e => setErreur(e?.response?.data?.detail || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { const t = setTimeout(fetchAll, 300); return () => clearTimeout(t) }, [search])

  const ouvrirCreate = () => setModal({ mode: 'create', data: { ...VIDE } })
  const ouvrirEdit = (a) => setModal({ mode: 'edit', data: { ...a, mot_de_passe: '', point_achat_id: a.point_achat_id || '' } })

  const sauver = async (e) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    try {
      const d = modal.data
      const payload = {
        nom_complet: d.nom_complet, telephone: d.telephone, email: d.email || null,
        point_achat_id: d.point_achat_id || null,
      }
      if (d.mot_de_passe) payload.mot_de_passe = d.mot_de_passe
      if (modal.mode === 'create') {
        if (!d.mot_de_passe) { setErreur('Mot de passe requis'); setSaving(false); return }
        payload.mot_de_passe = d.mot_de_passe
        await api.post('/admin/agents', payload)
        setOk('Agent créé — identifiants envoyés par email si renseigné')
      } else {
        await api.put(`/admin/agents/${d.id}`, payload)
        setOk('Agent mis à jour')
      }
      setModal(null); fetchAll()
    } catch (e2) {
      setErreur(e2?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally { setSaving(false) }
  }

  const supprimer = async (a) => {
    if (!await confirm({
      titre: 'Supprimer cet agent ?',
      message: `${a.nom_complet} (${a.telephone}) ne pourra plus se connecter. Cette action est définitive.`,
      confirmLabel: 'Supprimer', danger: true,
    })) return
    try {
      await api.delete(`/admin/agents/${a.id}`)
      setOk('Agent supprimé'); fetchAll()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur de suppression') }
  }

  return (
    <AdminLayout title="Agents commerciaux">
      {ConfirmDialog}
      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{erreur}<button onClick={() => setErreur('')} className="font-bold ml-4">&times;</button></div>}
      {ok && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{ok}<button onClick={() => setOk('')} className="font-bold ml-4">&times;</button></div>}

      {/* Barre recherche + ajout */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <p className="text-gray-500 text-sm"><span className="font-bold text-navy">{agents.length}</span> agent{agents.length > 1 ? 's' : ''} commercial{agents.length > 1 ? 'aux' : ''}</p>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher nom, téléphone, email..."
              className="input pl-9 !py-2 !text-xs w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={ouvrirCreate}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue transition-colors shrink-0">
            <Plus size={16} /> Nouvel agent
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Agent', 'Téléphone', 'Email', 'Point d\'achat', 'Statut', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                  <UserCog size={32} className="mx-auto mb-2 opacity-30" />Aucun agent trouvé
                </td></tr>
              ) : agents.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-blue font-bold text-xs">
                        {a.nom_complet?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-navy">{a.nom_complet}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{a.telephone}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{a.email || '—'}</td>
                  <td className="px-5 py-3">
                    {a.point_achat_nom
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700"><Store size={11} />{a.point_achat_nom}</span>
                      : <span className="text-gray-300 text-xs">Non assigné</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.statut === 'actif' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{a.statut}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => ouvrirEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy" title="Modifier"><Pencil size={15} /></button>
                      <button onClick={() => supprimer(a)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL CREATE / EDIT ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">{modal.mode === 'create' ? 'Nouvel agent commercial' : 'Modifier l\'agent'}</h2>
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
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email (reçoit les identifiants)</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" className="input pl-9" value={modal.data.email || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Point d'achat (marché)</label>
                <select className="input" value={modal.data.point_achat_id || ''}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, point_achat_id: e.target.value } }))}>
                  <option value="">— Non assigné —</option>
                  {pointsAchat.filter(p => p.actif).map(p => (
                    <option key={p.id} value={p.id}>{p.nom} — {p.ville}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">L'agent ne verra que les données de ce marché</p>
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
                  {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer l\'agent' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
