import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, ChevronLeft, ChevronRight, ThumbsUp, Edit2, Save, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getImageUrl, apiErr } from '../utils/api'
import { useConfirm } from '../components/common/useConfirm'
import IngredientEditor from '../components/common/IngredientEditor'

const STATUT_TABS = [
  { key: 'en_attente', label: 'En attente', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'approuvee',  label: 'Approuvées', color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'rejetee',    label: 'Rejetées',   color: 'text-red-500 bg-red-50 border-red-200' },
  { key: 'toutes',     label: 'Toutes',     color: 'text-gray-600 bg-gray-50 border-gray-200' },
]

export default function AdminSuggestions() {
  const [tab, setTab]         = useState('en_attente')
  const [suggestions, setSugg]= useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [rejNote, setRejNote]   = useState('')
  const [modal, setModal]       = useState(null) // 'approuver' | 'rejeter'
  const apprImgRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/suggestions/?statut=${tab}&page=${page}`)
      setSugg(data.items); setTotal(data.total)
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab, page])

  const openApprouver = (s) => {
    setSelected(s)
    setEditForm({ nom: s.nom, description: s.description || '', prix_fcfa: s.prix_suggere_fcfa || '', note_admin: '',
                  est_menu: !!s.est_menu, ingredients: s.ingredients || [], image_url: s.image_url || null, image_file: null })
    setModal('approuver')
  }

  const openRejeter = (s) => {
    setSelected(s); setRejNote(''); setModal('rejeter')
  }

  const [savingAppr, setSavingAppr] = useState(false)

  const handleApprouver = async () => {
    if (!editForm.nom?.trim()) { toast.error('Nom requis'); return }
    if (editForm.est_menu && (!editForm.ingredients || editForm.ingredients.length === 0)) {
      toast.error('Un menu doit avoir au moins un ingrédient'); return
    }
    setSavingAppr(true)
    try {
      let image_url = editForm.image_url
      if (editForm.image_file) {
        const fd = new FormData(); fd.append('file', editForm.image_file)
        image_url = (await api.post('/uploads/image-suggestion', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data.image_url
      }
      const { image_file, ...payload } = editForm
      await api.put(`/admin/suggestions/${selected.id}/approuver`, { ...payload, image_url })
      toast.success(`✅ "${editForm.nom}" approuvé et ajouté au catalogue !`)
      setModal(null); load()
    } catch (err) { toast.error(apiErr(err)) }
    finally { setSavingAppr(false) }
  }

  const { confirm, ConfirmDialog } = useConfirm()

  const handleRejeter = async () => {
    if (!await confirm({ titre: 'Rejeter cette suggestion ?', message: "La suggestion ne sera pas ajoutée au catalogue.", confirmLabel: 'Rejeter', danger: true })) return
    try {
      await api.put(`/admin/suggestions/${selected.id}/rejeter`, { note_admin: rejNote })
      toast.success('Suggestion rejetée')
      setModal(null); load()
    } catch (err) { toast.error(apiErr(err)) }
  }

  const nbPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-gray-50">
      {ConfirmDialog}
      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">💡 Suggestions clients</h1>
            <p className="text-white/50 text-xs">{total} suggestion{total !== 1 ? 's' : ''} · {tab === 'en_attente' ? 'À traiter' : tab}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {STATUT_TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
              className={`text-xs font-bold px-4 py-2 rounded-full border transition-all
                ${tab === t.key ? t.color + ' border' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse"/>)}</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <p className="text-5xl mb-3">💡</p>
            <p className="text-gray-400 font-medium">Aucune suggestion dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  {/* Votes badge */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-xl shrink-0">
                    <ThumbsUp size={14} className="text-blue-500"/>
                    <span className="text-xs font-bold text-blue-600">{s.votes}</span>
                  </div>

                  {s.image_url && (
                    <img src={getImageUrl(s.image_url)} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0"/>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-bold text-[#0D2137] text-sm">{s.nom}</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s.section_nom}</span>
                      {s.est_menu && <span className="text-[10px] bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full">🥘 MENU · {s.ingredients?.length || 0} ingr.</span>}
                      {s.statut === 'approuvee' && <span className="text-[10px] bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">✅ Approuvée</span>}
                      {s.statut === 'rejetee'   && <span className="text-[10px] bg-red-100 text-red-500 font-bold px-2 py-0.5 rounded-full">❌ Rejetée</span>}
                    </div>
                    {s.description && <p className="text-gray-400 text-xs truncate">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {s.prix_suggere_fcfa && <span className="text-amber-600 font-semibold">~{s.prix_suggere_fcfa.toLocaleString()} F</span>}
                      <span>Par {s.client_nom}</span>
                      <span>{new Date(s.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}</span>
                    </div>
                    {s.note_admin && <p className="text-xs text-gray-400 mt-1 italic">Note admin : {s.note_admin}</p>}
                  </div>

                  {/* Actions */}
                  {s.statut === 'en_attente' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openApprouver(s)}
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shadow-sm">
                        <Check size={12}/> Approuver
                      </button>
                      <button onClick={() => openRejeter(s)}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500 font-bold px-3 py-2 rounded-xl text-xs transition-colors border border-red-200">
                        <X size={12}/> Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {nbPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p=>p-1)}
              className="p-2 bg-white rounded-xl border border-gray-200 disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              <ChevronLeft size={14}/>
            </button>
            <span className="text-sm text-gray-500 font-medium">{page} / {nbPages}</span>
            <button disabled={page >= nbPages} onClick={() => setPage(p=>p+1)}
              className="p-2 bg-white rounded-xl border border-gray-200 disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              <ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>

      {/* Modal Approuver */}
      {modal === 'approuver' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-green-500 rounded-t-2xl p-5">
              <h2 className="text-white font-bold text-lg">✅ Approuver la suggestion</h2>
              <p className="text-white/70 text-xs mt-0.5">Le produit sera créé et visible dans le catalogue</p>
            </div>
            <div className="p-5 space-y-3">
              {/* Photo */}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Photo</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => apprImgRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 flex items-center justify-center overflow-hidden bg-gray-50 transition-colors shrink-0">
                    {editForm.image_file
                      ? <img src={URL.createObjectURL(editForm.image_file)} alt="" className="w-full h-full object-cover"/>
                      : editForm.image_url
                        ? <img src={getImageUrl(editForm.image_url)} alt="" className="w-full h-full object-cover"/>
                        : <Camera size={18} className="text-gray-300"/>}
                  </button>
                  <div className="text-xs text-gray-400">
                    <p className="font-medium text-gray-500">
                      {editForm.image_file ? 'Nouvelle photo ✓' : editForm.image_url ? 'Photo du client — cliquez pour remplacer' : 'Aucune photo — cliquez pour ajouter'}
                    </p>
                    <p>JPG, PNG ou WebP — max 5 Mo</p>
                  </div>
                  <input ref={apprImgRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value=''; if (f) setEditForm(v=>({...v, image_file:f})) }}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Nom du produit *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                  value={editForm.nom} onChange={e => setEditForm(f=>({...f, nom:e.target.value}))}/>
              </div>
              {!editForm.est_menu && (
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Prix final (FCFA)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                    value={editForm.prix_fcfa} onChange={e => setEditForm(f=>({...f, prix_fcfa: parseInt(e.target.value)||''}))}/>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Description</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                  value={editForm.description} onChange={e => setEditForm(f=>({...f, description:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Note interne (optionnel)</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Message visible par le client…"
                  value={editForm.note_admin} onChange={e => setEditForm(f=>({...f, note_admin:e.target.value}))}/>
              </div>

              {/* Type menu + ingrédients */}
              <label className="flex items-center gap-2.5 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-purple-600"
                  checked={!!editForm.est_menu}
                  onChange={e => setEditForm(f=>({...f, est_menu:e.target.checked}))}/>
                <div>
                  <p className="text-xs font-bold text-purple-700">🥘 Publier comme menu personnalisable</p>
                  <p className="text-[10px] text-purple-400">Le client composera son plat en choisissant les ingrédients</p>
                </div>
              </label>
              {editForm.est_menu && (
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Ingrédients du menu *</label>
                  <IngredientEditor value={editForm.ingredients} onChange={v => setEditForm(f=>({...f, ingredients:v}))}/>
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-purple-500">Prix du menu (calculé = Σ défauts ingrédients)</span>
                    <span className="text-sm font-bold text-purple-700">
                      {(editForm.ingredients || []).reduce((a, i) => a + (parseInt(i.prix_defaut_fcfa) || 0), 0).toLocaleString()} F
                    </span>
                  </div>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                ⭐ +100 pts fidélité seront crédités automatiquement au client
              </div>
              <div className="flex gap-2">
                <button onClick={handleApprouver} disabled={savingAppr} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {savingAppr ? 'Publication…' : '✅ Confirmer et publier'}
                </button>
                <button onClick={() => setModal(null)} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejeter */}
      {modal === 'rejeter' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-red-500 rounded-t-2xl p-5">
              <h2 className="text-white font-bold text-lg">❌ Rejeter la suggestion</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-gray-600 text-sm">Vous allez rejeter <strong>"{selected.nom}"</strong>.</p>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Raison (visible par le client)</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
                  placeholder="Ex: Produit déjà disponible sous un autre nom…"
                  value={rejNote} onChange={e => setRejNote(e.target.value)}/>
              </div>
              <div className="flex gap-2">
                <button onClick={handleRejeter} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  Confirmer le rejet
                </button>
                <button onClick={() => setModal(null)} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
