import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Search, Save, TrendingUp, TrendingDown, BarChart2, RefreshCw, Edit2, X, Check, Trash2, Plus, UtensilsCrossed, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getImageUrl } from '../utils/api'
import { useConfirm } from '../components/common/useConfirm'
import IngredientEditor from '../components/common/IngredientEditor'

const SECTION_EMOJI = {
  menus_ingredients: '🥘', fruits: '🍊', boissons: '🥤', boulangerie: '🍞',
  epices: '🌶️', epicerie: '🛒', entretien: '🧹', cosmetique: '🧴', ma_liste: '📝',
}

export default function AdminPrix() {
  const [section, setSection] = useState('')
  const [q, setQ]             = useState('')
  const [produits, setProduits] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [editProd, setEditProd]   = useState(null)   // produit en cours d'édition (modal)
  const [editVal, setEditVal]     = useState({})
  const [editImg, setEditImg]     = useState(null)
  const [saving, setSaving]       = useState(false)

  // Bulk update
  const [bulkModal, setBulkModal] = useState(false)
  const [bulk, setBulk] = useState({ mode: 'pourcentage', valeur: 0, raison: '', section_code: '' })
  const [bulkSaving, setBulkSaving] = useState(false)

  // Historique
  const [histModal, setHistModal] = useState(false)
  const [histProduit, setHistProduit] = useState(null)
  const [historique, setHistorique]   = useState([])
  const [sections, setSections]       = useState([])

  // Création produit
  const [createModal, setCreateModal] = useState(false)
  const [createVal, setCreateVal]     = useState({ nom:'', section_id:'', prix_base_fcfa:0, prix_max_fcfa:'', description:'', est_menu:false, ingredients:[] })
  const [createImg, setCreateImg]     = useState(null)
  const [creating, setCreating]       = useState(false)

  // Ingrédients (menus)
  const [ingModal, setIngModal]       = useState(null)   // produit menu ouvert
  const [ingredients, setIngredients] = useState([])
  const [ingLoading, setIngLoading]   = useState(false)
  const [ingEditing, setIngEditing]   = useState(null)   // id ingrédient en édition
  const [ingVal, setIngVal]           = useState({})
  const [ingNew, setIngNew]           = useState(false)
  const [ingSaving, setIngSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page })
      if (section) params.set('section', section)
      if (q)       params.set('q', q)
      const { data } = await api.get(`/admin/prix/?${params}`)
      setProduits(data.produits); setTotal(data.total)
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [section, q, page])

  useEffect(() => {
    api.get('/catalogue/sections')
      .then(({ data }) => setSections([
        { code: '', nom: 'Toutes les sections', emoji: '📦' },
        ...data.map(s => ({ code: s.code, nom: s.nom, emoji: SECTION_EMOJI[s.code] || '📦', id: s.id })),
      ]))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (p) => {
    setEditProd(p)
    setEditImg(null)
    setEditVal({
      nom: p.nom,
      description: p.description || '',
      section_id: p.section_id || sections.find(s => s.code === p.section_code)?.id || '',
      prix_base_fcfa: p.prix_base_fcfa,
      prix_max_fcfa: p.prix_max_fcfa || '',
      est_actif: p.est_actif,
      raison: '',
    })
  }

  const closeEdit = () => { setEditProd(null); setEditVal({}); setEditImg(null) }

  const saveEdit = async () => {
    if (!editProd) return
    if (!editVal.nom?.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    try {
      // Prix + infos générales via l'endpoint admin (prix_base → historique)
      const body = {
        nom: editVal.nom.trim(),
        description: editVal.description || null,
        est_actif: editVal.est_actif,
        raison: editVal.raison || 'Mise à jour manuelle',
      }
      if (!editProd.est_menu) {
        body.prix_base_fcfa = parseInt(editVal.prix_base_fcfa) || 0
        body.prix_max_fcfa = editVal.prix_max_fcfa === '' || editVal.prix_max_fcfa == null
          ? null : parseInt(editVal.prix_max_fcfa)
      }
      await api.put(`/admin/prix/${editProd.id}`, body)
      // Section via l'endpoint catalogue si elle a changé
      const sec = sections.find(s => s.id === editVal.section_id)
      if (sec && sec.code !== editProd.section_code) {
        await api.put(`/catalogue/produits/${editProd.id}`, { section_id: editVal.section_id })
      }
      // Photo
      if (editImg) {
        const fd = new FormData(); fd.append('file', editImg)
        await api.post(`/catalogue/produits/${editProd.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success('Produit mis à jour')
      closeEdit()
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setSaving(false) }
  }

  const loadHistorique = async (p) => {
    setHistProduit(p)
    const { data } = await api.get(`/admin/prix/${p.id}/historique`)
    setHistorique(data)
    setHistModal(true)
  }

  const { confirm, ConfirmDialog } = useConfirm()

  const toggleActif = async (p) => {
    try {
      await api.put(`/admin/prix/${p.id}`, { est_actif: !p.est_actif })
      setProduits(prev => prev.map(x => x.id === p.id ? {...x, est_actif: !p.est_actif} : x))
      toast.success(p.est_actif ? `"${p.nom}" désactivé` : `"${p.nom}" activé`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const deleteProduit = async (p) => {
    if (!await confirm({ titre: 'Supprimer ce produit ?', message: `"${p.nom}" sera retiré du catalogue (les commandes passées sont conservées).`, confirmLabel: 'Supprimer', danger: true })) return
    try {
      await api.delete(`/catalogue/produits/${p.id}`)
      setProduits(prev => prev.filter(x => x.id !== p.id)); setTotal(t => t - 1)
      toast.success('Produit supprimé')
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')

  const createProduit = async () => {
    if (!createVal.nom.trim() || !createVal.section_id) { toast.error('Nom et section requis'); return }
    if (createVal.est_menu && !(createVal.ingredients || []).some(i => (i.nom || '').trim())) {
      toast.error('Ajoutez au moins un ingrédient au menu'); return
    }
    setCreating(true)
    try {
      const slug = `${slugify(createVal.nom)}-${Date.now().toString(36)}`
      const prixMenu = (createVal.ingredients || []).reduce((a, i) => a + (parseInt(i.prix_defaut_fcfa) || 0), 0)
      const { data: prod } = await api.post('/catalogue/produits', {
        ...createVal,
        slug,
        prix_base_fcfa: createVal.est_menu ? prixMenu : parseInt(createVal.prix_base_fcfa) || 0,
        prix_max_fcfa: createVal.prix_max_fcfa === '' ? null : parseInt(createVal.prix_max_fcfa),
      })
      if (createImg && prod?.id) {
        const fd = new FormData(); fd.append('file', createImg)
        await api.post(`/catalogue/produits/${prod.id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      // Menu : créer les ingrédients — le backend recalcule prix_base/max via _sync_prix_menu
      if (createVal.est_menu && prod?.id) {
        for (const ing of (createVal.ingredients || [])) {
          if (!(ing.nom || '').trim()) continue
          await api.post(`/catalogue/produits/${prod.id}/ingredients`, ing)
        }
      }
      toast.success('Produit créé !'); setCreateModal(false)
      setCreateVal({ nom:'', section_id:'', prix_base_fcfa:0, prix_max_fcfa:'', description:'', est_menu:false, ingredients:[] })
      setCreateImg(null)
      setPage(1); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur création') }
    finally { setCreating(false) }
  }

  // ── Ingrédients ──────────────────────────────────────────────
  const openIngredients = async (p) => {
    setIngModal(p); setIngLoading(true); setIngEditing(null); setIngNew(false)
    try {
      const { data } = await api.get(`/catalogue/produits/${p.id}/ingredients`)
      setIngredients(data)
    } catch { toast.error('Erreur chargement ingrédients'); setIngredients([]) }
    finally { setIngLoading(false) }
  }

  const saveIngredient = async (id) => {
    setIngSaving(true)
    try {
      await api.put(`/catalogue/ingredients/${id}`, ingVal)
      setIngredients(prev => prev.map(i => i.id === id ? {...i, ...ingVal} : i))
      setIngEditing(null); toast.success('Ingrédient mis à jour')
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setIngSaving(false) }
  }

  const addIngredient = async () => {
    if (!(ingVal.nom || '').trim()) { toast.error('Nom requis'); return }
    setIngSaving(true)
    try {
      const { data } = await api.post(`/catalogue/produits/${ingModal.id}/ingredients`, ingVal)
      setIngredients(prev => [...prev, { id: data.id, ...ingVal }])
      setIngNew(false); setIngVal({}); toast.success('Ingrédient ajouté')
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setIngSaving(false) }
  }

  const deleteIngredient = async (ing) => {
    if (!await confirm({ titre: 'Retirer cet ingrédient ?', message: `"${ing.nom}" sera retiré du menu "${ingModal.nom}".`, confirmLabel: 'Retirer', danger: true })) return
    try {
      await api.delete(`/catalogue/ingredients/${ing.id}`)
      setIngredients(prev => prev.filter(i => i.id !== ing.id))
      toast.success('Ingrédient retiré')
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const toggleIngredient = async (ing) => {
    try {
      await api.put(`/catalogue/ingredients/${ing.id}`, { actif: !ing.actif })
      setIngredients(prev => prev.map(i => i.id === ing.id ? {...i, actif: !ing.actif} : i))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const bulkUpdate = async () => {
    if (!bulk.valeur && bulk.valeur !== 0) { toast.error('Valeur requise'); return }
    if (!await confirm({ titre: 'Mise à jour en masse ?', message: 'Les prix de tous les produits correspondant au filtre seront modifiés.', confirmLabel: 'Appliquer', danger: true })) return
    setBulkSaving(true)
    try {
      const { data } = await api.post('/admin/prix/bulk-update', bulk)
      toast.success(`${data.mis_a_jour} produit(s) mis à jour !${data.menus_ignores ? ` (${data.menus_ignores} menu(s) ignoré(s) — prix auto)` : ''}`)
      setBulkModal(false)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setBulkSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {ConfirmDialog}
      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={18}/>
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">💰 Gestion des Prix</h1>
            <p className="text-white/50 text-xs">{total} produit{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 bg-white/10 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-colors">
            <Plus size={14}/> Nouveau produit
          </button>
          <button onClick={() => { setBulk(b => ({...b, section_code: section})); setBulkModal(true) }}
            className="flex items-center gap-2 bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-500 transition-colors shadow-sm">
            <TrendingUp size={14}/> Mise à jour en masse
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
              placeholder="Rechercher un produit…"
              value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
            value={section} onChange={e => { setSection(e.target.value); setPage(1) }}>
            {sections.map(s => <option key={s.code} value={s.code}>{s.emoji} {s.nom}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wide">
            <div className="col-span-4">Produit</div>
            <div className="col-span-2 text-center">Section</div>
            <div className="col-span-2 text-right">Prix de base</div>
            <div className="col-span-2 text-right">Prix max</div>
            <div className="col-span-1 text-center">Actif</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="space-y-0">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="h-12 animate-pulse border-b border-gray-50 bg-gray-50"/>
              ))}
            </div>
          ) : produits.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Aucun produit trouvé</div>
          ) : (
            <div>
              {produits.map(p => (
                  <div key={p.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 items-center text-sm hover:bg-gray-50/70 transition-colors ${!p.est_actif ? 'opacity-50' : ''}`}>

                    {/* Nom */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {p.image_url && <img src={getImageUrl(p.image_url)} alt={p.nom} className="w-full h-full object-cover"/>}
                      </div>
                      <span className="font-medium text-[#0D2137] truncate text-xs">{p.nom}</span>
                      {p.est_menu && <span className="text-[9px] bg-purple-100 text-purple-600 font-bold px-1.5 py-0.5 rounded shrink-0">MENU</span>}
                    </div>

                    {/* Section */}
                    <div className="col-span-2 text-center">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.section_code}</span>
                    </div>

                    {/* Prix de base */}
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-amber-600 text-sm" title={p.est_menu ? 'Calculé : Σ prix défaut des ingrédients' : ''}>
                        {(p.prix_base_fcfa||0).toLocaleString()} F
                      </span>
                      {p.est_menu && <span className="text-[9px] text-purple-400 ml-1">auto</span>}
                    </div>

                    {/* Prix max */}
                    <div className="col-span-2 text-right">
                      <span className="text-xs text-gray-400" title={p.est_menu ? 'Calculé : Σ prix max des ingrédients' : ''}>
                        {p.prix_max_fcfa ? p.prix_max_fcfa.toLocaleString() + ' F' : '—'}
                      </span>
                      {p.est_menu && p.prix_max_fcfa && <span className="text-[9px] text-purple-400 ml-1">auto</span>}
                    </div>

                    {/* Actif */}
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleActif(p)}
                        title={p.est_actif ? 'Actif — cliquer pour désactiver' : 'Inactif — cliquer pour activer'}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${p.est_actif ? 'bg-green-400 hover:bg-green-500' : 'bg-gray-300 hover:bg-gray-400'}`}>
                        {p.est_actif
                          ? <Check size={11} className="text-white"/>
                          : <X size={11} className="text-white"/>}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {p.est_menu && (
                        <button onClick={() => openIngredients(p)} title="Gérer les ingrédients du menu"
                          className="w-7 h-7 bg-purple-50 hover:bg-purple-100 text-purple-500 rounded-lg flex items-center justify-center transition-colors">
                          <UtensilsCrossed size={11}/>
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} title="Modifier le produit"
                        className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center transition-colors">
                        <Edit2 size={11}/>
                      </button>
                      <button onClick={() => loadHistorique(p)} title="Historique des prix"
                        className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center transition-colors">
                        <BarChart2 size={11}/>
                      </button>
                      <button onClick={() => deleteProduit(p)} title="Supprimer"
                        className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {Math.ceil(total / 50) > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button disabled={page === 1} onClick={() => setPage(p=>p-1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">{page} / {Math.ceil(total/50)}</span>
            <button disabled={page >= Math.ceil(total/50)} onClick={() => setPage(p=>p+1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Modal Bulk Update */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-[#0D2137] rounded-t-2xl p-5 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">📊 Mise à jour en masse</h2>
              <button onClick={() => setBulkModal(false)} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Section concernée</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                  value={bulk.section_code} onChange={e => setBulk(b=>({...b, section_code:e.target.value}))}>
                  {sections.map(s => <option key={s.code} value={s.code}>{s.emoji} {s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Mode de mise à jour</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['pourcentage','% Pourcentage'],['fixe','+ / − Valeur fixe (F)']].map(([v,l]) => (
                    <button key={v} onClick={() => setBulk(b=>({...b, mode:v}))}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${bulk.mode===v ? 'bg-[#0D2137] text-white border-[#0D2137]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">
                  {bulk.mode === 'pourcentage' ? 'Variation (ex: +10 = +10%, -5 = -5%)' : 'Montant (ex: +200, -100)'}
                </label>
                <input type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                  value={bulk.valeur} onChange={e => setBulk(b=>({...b, valeur: parseFloat(e.target.value)||0}))}/>
                <p className="text-xs text-gray-400 mt-1">
                  {bulk.mode === 'pourcentage'
                    ? `Exemple : 10 = +10%, -5 = baisser de 5% · les menus : le % s'applique à leurs ingrédients`
                    : `Exemple : 200 = ajouter 200 FCFA, -100 = réduire de 100 F · les menus sont ignorés (prix auto)`}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Raison (pour l'historique)</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                  placeholder="Ex: Révision mensuelle des prix…"
                  value={bulk.raison} onChange={e => setBulk(b=>({...b, raison:e.target.value}))}/>
              </div>
              <div className={`rounded-xl p-3 text-xs font-semibold ${bulk.valeur > 0 ? 'bg-green-50 text-green-600' : bulk.valeur < 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                {bulk.valeur > 0 ? `⬆️ Hausse de ${bulk.mode==='pourcentage' ? bulk.valeur+'%' : bulk.valeur+' FCFA'} sur ${bulk.section_code || 'tous les produits'}`
                 : bulk.valeur < 0 ? `⬇️ Baisse de ${bulk.mode==='pourcentage' ? Math.abs(bulk.valeur)+'%' : Math.abs(bulk.valeur)+' FCFA'} sur ${bulk.section_code || 'tous les produits'}`
                 : 'Aucun changement prévu'}
              </div>
              <div className="flex gap-2">
                <button onClick={bulkUpdate} disabled={bulkSaving || bulk.valeur === 0}
                  className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {bulkSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><RefreshCw size={14}/> Appliquer</>}
                </button>
                <button onClick={() => setBulkModal(false)} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {histModal && histProduit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="bg-gray-800 rounded-t-2xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">📈 Historique des prix</h2>
                <p className="text-white/50 text-xs">{histProduit.nom}</p>
              </div>
              <button onClick={() => setHistModal(false)} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-4">
              {historique.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucun changement de prix enregistré</p>
              ) : (
                <div className="space-y-2">
                  {historique.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      {h.variation_pct > 0
                        ? <TrendingUp size={16} className="text-green-500 shrink-0"/>
                        : <TrendingDown size={16} className="text-red-500 shrink-0"/>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 line-through">{h.ancien_prix.toLocaleString()} F</span>
                          <span className="text-xs">→</span>
                          <span className="font-bold text-sm text-[#0D2137]">{h.nouveau_prix.toLocaleString()} F</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.variation_pct >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {h.variation_pct >= 0 ? '+' : ''}{h.variation_pct.toFixed(1)}%
                          </span>
                        </div>
                        {h.raison && <p className="text-xs text-gray-400 truncate">{h.raison}</p>}
                        <p className="text-[10px] text-gray-300">{new Date(h.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau produit */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-[#0D2137] rounded-t-2xl p-5 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">➕ Nouveau produit</h2>
              <button onClick={() => setCreateModal(false)} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Nom du produit *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                  placeholder="Ex: Riz parfumé 5kg"
                  value={createVal.nom} onChange={e => setCreateVal(v=>({...v, nom:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Section *</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                  value={createVal.section_id} onChange={e => {
                    const sec = sections.find(s => s.id === e.target.value)
                    setCreateVal(v => ({...v, section_id:e.target.value, est_menu: sec?.code === 'menus_ingredients' ? true : v.est_menu}))
                  }}>
                  <option value="">— Choisir —</option>
                  {sections.filter(s => s.id).map(s => <option key={s.id} value={s.id}>{s.emoji} {s.nom}</option>)}
                </select>
              </div>
              {!createVal.est_menu && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5">Prix de base (FCFA)</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                      value={createVal.prix_base_fcfa} onChange={e => setCreateVal(v=>({...v, prix_base_fcfa:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5">Prix max (optionnel)</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                      placeholder="—" value={createVal.prix_max_fcfa} onChange={e => setCreateVal(v=>({...v, prix_max_fcfa:e.target.value}))}/>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Description (optionnel)</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] resize-none"
                  value={createVal.description} onChange={e => setCreateVal(v=>({...v, description:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Photo (optionnel)</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-3 py-3 cursor-pointer hover:border-[#0D2137] transition-colors">
                  {createImg ? (
                    <img src={URL.createObjectURL(createImg)} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                  ) : (
                    <Camera size={20} className="text-gray-300"/>
                  )}
                  <span className="text-xs text-gray-500">{createImg ? createImg.name : 'Cliquez pour choisir une image (jpg, png, webp)'}</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => setCreateImg(e.target.files?.[0] || null)}/>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#0D2137]"
                  checked={createVal.est_menu} onChange={e => setCreateVal(v=>({...v, est_menu:e.target.checked}))}/>
                C'est un menu à composer (avec ingrédients ajustables)
              </label>
              {createVal.est_menu && (
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Ingrédients du menu *</label>
                  <IngredientEditor value={createVal.ingredients} onChange={v => setCreateVal(f=>({...f, ingredients:v}))}/>
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-purple-500">Prix du menu (calculé = Σ défauts ingrédients)</span>
                    <span className="text-sm font-bold text-purple-700">
                      {(createVal.ingredients || []).reduce((a, i) => a + (parseInt(i.prix_defaut_fcfa) || 0), 0).toLocaleString()} F
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={createProduit} disabled={creating}
                  className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Plus size={14}/> Créer le produit</>}
                </button>
                <button onClick={() => setCreateModal(false)} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier le produit */}
      {editProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-[#0D2137] rounded-t-2xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">✏️ Modifier le produit</h2>
                <p className="text-white/50 text-xs">{editProd.nom}</p>
              </div>
              <button onClick={closeEdit} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Nom du produit *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                  value={editVal.nom} onChange={e => setEditVal(v=>({...v, nom:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Section</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                  value={editVal.section_id} onChange={e => setEditVal(v=>({...v, section_id:e.target.value}))}>
                  {sections.filter(s => s.id).map(s => <option key={s.id} value={s.id}>{s.emoji} {s.nom}</option>)}
                </select>
              </div>
              {editProd.est_menu ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700">
                  🧩 <b>Menu à composer</b> — prix de base <b>{(editProd.prix_base_fcfa||0).toLocaleString()} F</b> et prix max <b>{(editProd.prix_max_fcfa||0).toLocaleString()} F</b> calculés automatiquement à partir des ingrédients (bouton 🧩).
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5">Prix de base (FCFA)</label>
                    <input type="number" min="0" className="w-full border border-amber-300 bg-amber-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                      value={editVal.prix_base_fcfa} onChange={e => setEditVal(v=>({...v, prix_base_fcfa:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1.5">Prix max indicatif</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                      placeholder="—" value={editVal.prix_max_fcfa} onChange={e => setEditVal(v=>({...v, prix_max_fcfa:e.target.value}))}/>
                  </div>
                </div>
              )}
              {!editProd.est_menu && parseInt(editVal.prix_base_fcfa) !== editProd.prix_base_fcfa && (
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Raison du changement de prix (historique)</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="Ex: Révision prix fournisseur…"
                    value={editVal.raison} onChange={e => setEditVal(v=>({...v, raison:e.target.value}))}/>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Description</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] resize-none"
                  value={editVal.description} onChange={e => setEditVal(v=>({...v, description:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5">Photo</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-3 py-3 cursor-pointer hover:border-[#0D2137] transition-colors">
                  {editImg ? (
                    <img src={URL.createObjectURL(editImg)} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                  ) : editProd.image_url ? (
                    <img src={getImageUrl(editProd.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                  ) : (
                    <Camera size={20} className="text-gray-300"/>
                  )}
                  <span className="text-xs text-gray-500">{editImg ? editImg.name : 'Cliquez pour remplacer la photo'}</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => setEditImg(e.target.files?.[0] || null)}/>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#0D2137]"
                  checked={!!editVal.est_actif} onChange={e => setEditVal(v=>({...v, est_actif:e.target.checked}))}/>
                Produit actif (visible dans le catalogue)
              </label>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Save size={14}/> Enregistrer</>}
                </button>
                <button onClick={closeEdit} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ingrédients d'un menu */}
      {ingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="bg-purple-900 rounded-t-2xl p-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-bold text-lg">🧩 Ingrédients du menu</h2>
                <p className="text-white/50 text-xs">{ingModal.nom}</p>
              </div>
              <button onClick={() => setIngModal(null)} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {ingLoading ? (
                <p className="text-center text-gray-400 py-10">Chargement…</p>
              ) : (
                <div className="space-y-2">
                  {ingredients.map(ing => {
                    const ed = ingEditing === ing.id
                    return (
                      <div key={ing.id} className={`border rounded-xl p-3 ${ing.actif === false ? 'opacity-50 border-gray-200' : 'border-gray-200'}`}>
                        {!ed ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0D2137] truncate">
                                {ing.nom} {ing.est_obligatoire && <span className="text-red-400">*</span>}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {ing.unite} · défaut {ing.quantite_defaut} · {ing.quantite_min}–{ing.quantite_max ?? '∞'}
                                {' · '}{ing.prix_defaut_fcfa}F <span className="text-gray-300">({ing.prix_min_fcfa}–{ing.prix_max_fcfa ?? '∞'} F)</span>
                              </p>
                            </div>
                            <button onClick={() => toggleIngredient(ing)} title={ing.actif !== false ? 'Actif' : 'Inactif'}
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${ing.actif !== false ? 'bg-green-400' : 'bg-gray-300'}`}>
                              {ing.actif !== false ? <Check size={10} className="text-white"/> : <X size={10} className="text-white"/>}
                            </button>
                            <button onClick={() => { setIngEditing(ing.id); setIngVal({ nom:ing.nom, unite:ing.unite, quantite_defaut:ing.quantite_defaut, quantite_min:ing.quantite_min, quantite_max:ing.quantite_max, prix_defaut_fcfa:ing.prix_defaut_fcfa, prix_min_fcfa:ing.prix_min_fcfa, prix_max_fcfa:ing.prix_max_fcfa, est_obligatoire:ing.est_obligatoire }) }}
                              className="w-6 h-6 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center"><Edit2 size={10}/></button>
                            <button onClick={() => deleteIngredient(ing)}
                              className="w-6 h-6 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg flex items-center justify-center"><Trash2 size={10}/></button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <input className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400" placeholder="Nom"
                                value={ingVal.nom} onChange={e=>setIngVal(v=>({...v,nom:e.target.value}))}/>
                              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400 bg-white"
                                value={ingVal.unite} onChange={e=>setIngVal(v=>({...v,unite:e.target.value}))}>
                                <option value="g">grammes (g)</option><option value="cl">centilitres (cl)</option>
                                <option value="pcs">pièces (pcs)</option><option value="unite">unité</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
                              <div>Qté défaut<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.quantite_defaut} onChange={e=>setIngVal(v=>({...v,quantite_defaut:parseFloat(e.target.value)||0}))}/></div>
                              <div>Qté min<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.quantite_min} onChange={e=>setIngVal(v=>({...v,quantite_min:parseFloat(e.target.value)||0}))}/></div>
                              <div>Qté max<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.quantite_max ?? ''} onChange={e=>setIngVal(v=>({...v,quantite_max:e.target.value===''?null:parseFloat(e.target.value)}))}/></div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
                              <div>Prix défaut F<input type="number" className="w-full border border-amber-300 bg-amber-50 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.prix_defaut_fcfa} onChange={e=>setIngVal(v=>({...v,prix_defaut_fcfa:parseInt(e.target.value)||0}))}/></div>
                              <div>Prix min F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.prix_min_fcfa} onChange={e=>setIngVal(v=>({...v,prix_min_fcfa:parseInt(e.target.value)||0}))}/></div>
                              <div>Prix max F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                                value={ingVal.prix_max_fcfa ?? ''} onChange={e=>setIngVal(v=>({...v,prix_max_fcfa:e.target.value===''?null:parseInt(e.target.value)}))}/></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                                <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600"
                                  checked={!!ingVal.est_obligatoire} onChange={e=>setIngVal(v=>({...v,est_obligatoire:e.target.checked}))}/>
                                Ingrédient obligatoire
                              </label>
                              <div className="flex gap-1.5">
                                <button onClick={() => saveIngredient(ing.id)} disabled={ingSaving}
                                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                                  <Check size={11}/> Enregistrer
                                </button>
                                <button onClick={() => setIngEditing(null)} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs">Annuler</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {ingredients.length === 0 && !ingNew && (
                    <p className="text-center text-gray-400 py-6 text-sm">Aucun ingrédient — ajoutez-en un ci-dessous</p>
                  )}

                  {/* Ligne nouvel ingrédient */}
                  {ingNew ? (
                    <div className="border-2 border-dashed border-purple-200 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400" placeholder="Nom de l'ingrédient *"
                          value={ingVal.nom || ''} onChange={e=>setIngVal(v=>({...v,nom:e.target.value}))}/>
                        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                          value={ingVal.unite || 'g'} onChange={e=>setIngVal(v=>({...v,unite:e.target.value}))}>
                          <option value="g">grammes (g)</option><option value="cl">centilitres (cl)</option>
                          <option value="pcs">pièces (pcs)</option><option value="unite">unité</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
                        <div>Qté défaut<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.quantite_defaut ?? 100} onChange={e=>setIngVal(v=>({...v,quantite_defaut:parseFloat(e.target.value)||0}))}/></div>
                        <div>Qté min<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.quantite_min ?? 0} onChange={e=>setIngVal(v=>({...v,quantite_min:parseFloat(e.target.value)||0}))}/></div>
                        <div>Qté max<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.quantite_max ?? ''} onChange={e=>setIngVal(v=>({...v,quantite_max:e.target.value===''?null:parseFloat(e.target.value)}))}/></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
                        <div>Prix défaut F<input type="number" className="w-full border border-amber-300 bg-amber-50 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.prix_defaut_fcfa ?? 0} onChange={e=>setIngVal(v=>({...v,prix_defaut_fcfa:parseInt(e.target.value)||0}))}/></div>
                        <div>Prix min F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.prix_min_fcfa ?? 0} onChange={e=>setIngVal(v=>({...v,prix_min_fcfa:parseInt(e.target.value)||0}))}/></div>
                        <div>Prix max F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                          value={ingVal.prix_max_fcfa ?? ''} onChange={e=>setIngVal(v=>({...v,prix_max_fcfa:e.target.value===''?null:parseInt(e.target.value)}))}/></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600"
                            checked={!!ingVal.est_obligatoire} onChange={e=>setIngVal(v=>({...v,est_obligatoire:e.target.checked}))}/>
                          Obligatoire
                        </label>
                        <div className="flex gap-1.5">
                          <button onClick={addIngredient} disabled={ingSaving}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                            <Plus size={11}/> Ajouter
                          </button>
                          <button onClick={() => { setIngNew(false); setIngVal({}) }} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs">Annuler</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setIngNew(true); setIngEditing(null); setIngVal({ unite:'g', quantite_defaut:100, quantite_min:0, quantite_max:null, prix_defaut_fcfa:0, prix_min_fcfa:0, prix_max_fcfa:null, est_obligatoire:false }) }}
                      className="w-full border-2 border-dashed border-purple-200 text-purple-500 rounded-xl py-2.5 text-xs font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5">
                      <Plus size={13}/> Ajouter un ingrédient
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
