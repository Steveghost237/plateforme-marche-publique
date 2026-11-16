import { useEffect, useState } from 'react'
import { Search, ShieldCheck, Plus, Pencil, Trash2, X, Phone, Mail, UserCheck, UserX } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'
import { useConfirm } from '../components/common/useConfirm'
import Avatar from '../components/common/Avatar'
import { useAuth } from '../store'

const VIDE = { nom_complet: '', telephone: '', email: '', mot_de_passe: '' }

export default function AdminAdministrateurs() {
  const { user: me } = useAuth()
  const [admins, setAdmins] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchAll = () => {
    setLoading(true)
    api.get('/admin/administrateurs', { params: search ? { q: search } : {} })
      .then(r => setAdmins(r.data))
      .catch(e => setErreur(e?.response?.data?.detail || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { const t = setTimeout(fetchAll, 300); return () => clearTimeout(t) }, [search])

  const sauver = async (e) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    try {
      const d = modal.data
      const payload = { nom_complet: d.nom_complet, email: d.email || null }
      if (d.mot_de_passe) payload.mot_de_passe = d.mot_de_passe
      if (modal.mode === 'create') {
        if (!d.mot_de_passe) { setErreur('Mot de passe requis'); setSaving(false); return }
        payload.telephone = d.telephone
        await api.post('/admin/administrateurs', payload)
        setOk('Administrateur créé')
      } else {
        await api.put(`/admin/administrateurs/${d.id}`, payload)
        setOk('Administrateur mis à jour')
      }
      setModal(null); fetchAll()
    } catch (e2) {
      setErreur(e2?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally { setSaving(false) }
  }

  const supprimer = async (a) => {
    if (!await confirm({
      titre: 'Supprimer cet administrateur ?',
      message: `${a.nom_complet} (${a.telephone}) perdra définitivement l'accès à l'administration.`,
      confirmLabel: 'Supprimer', danger: true,
    })) return
    try {
      await api.delete(`/admin/administrateurs/${a.id}`)
      setOk('Administrateur supprimé'); fetchAll()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur de suppression') }
  }

  const toggleStatut = async (a) => {
    const st = a.statut === 'actif' ? 'suspendu' : 'actif'
    if (!await confirm({
      titre: st === 'suspendu' ? 'Suspendre cet administrateur ?' : 'Réactiver cet administrateur ?',
      message: st === 'suspendu' ? 'Il ne pourra plus se connecter au tableau de bord.' : 'Il retrouvera l\'accès complet.',
      confirmLabel: st === 'suspendu' ? 'Suspendre' : 'Réactiver', danger: st === 'suspendu',
    })) return
    try {
      await api.put(`/admin/administrateurs/${a.id}`, { statut: st })
      fetchAll()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur') }
  }

  return (
    <AdminLayout title="Administrateurs">
      {ConfirmDialog}
      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{erreur}<button onClick={() => setErreur('')} className="font-bold ml-4">&times;</button></div>}
      {ok && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{ok}<button onClick={() => setOk('')} className="font-bold ml-4">&times;</button></div>}

      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <p className="text-gray-500 text-sm"><span className="font-bold text-navy">{admins.length}</span> administrateur{admins.length > 1 ? 's' : ''}</p>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher nom, téléphone, email..."
              className="input pl-9 !py-2 !text-xs w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setModal({ mode: 'create', data: { ...VIDE } })}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue transition-colors shrink-0">
            <Plus size={16} /> Nouvel admin
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Administrateur', 'Rôle', 'Téléphone', 'Email', 'Statut', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun administrateur</td></tr>
              ) : admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={a} size="sm" bg="bg-navy/10" text="text-navy"/>
                      <div>
                        <span className="font-semibold text-navy">{a.nom_complet}</span>
                        {a.id === me?.id && <span className="ml-2 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">VOUS</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{a.telephone}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{a.email || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.statut === 'actif' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{a.statut}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ mode: 'edit', data: { ...a, mot_de_passe: '' } })}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-navy" title="Modifier"><Pencil size={15} /></button>
                      {a.id !== me?.id && <>
                        <button onClick={() => toggleStatut(a)}
                          className={`p-1.5 rounded-lg transition-colors ${a.statut === 'actif' ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                          title={a.statut === 'actif' ? 'Suspendre' : 'Réactiver'}>
                          {a.statut === 'actif' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                        <button onClick={() => supprimer(a)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 size={15} /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">{modal.mode === 'create' ? 'Nouvel administrateur' : 'Modifier l\'administrateur'}</h2>
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
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" className="input pl-9" value={modal.data.email || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} />
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
                  {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer l\'admin' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
