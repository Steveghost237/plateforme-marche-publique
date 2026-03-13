import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Search, Save, TrendingUp, TrendingDown, BarChart2, RefreshCw, Edit2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const SECTIONS = [
  { code: '',                  label: 'Toutes les sections', emoji: '📦' },
  { code: 'menus_ingredients', label: 'Menus & Ingrédients', emoji: '🥘' },
  { code: 'fruits',            label: 'Fruits & Légumes',    emoji: '🍊' },
  { code: 'boissons',          label: 'Boissons',            emoji: '🥤' },
  { code: 'boulangerie',       label: 'Boulangerie',         emoji: '🍞' },
  { code: 'epices',            label: 'Épices & Condiments', emoji: '🌶️' },
]

export default function AdminPrix() {
  const [section, setSection] = useState('')
  const [q, setQ]             = useState('')
  const [produits, setProduits] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal]     = useState({})
  const [saving, setSaving]       = useState(false)

  // Bulk update
  const [bulkModal, setBulkModal] = useState(false)
  const [bulk, setBulk] = useState({ mode: 'pourcentage', valeur: 0, raison: '', section_code: '' })
  const [bulkSaving, setBulkSaving] = useState(false)

  // Historique
  const [histModal, setHistModal] = useState(false)
  const [histProduit, setHistProduit] = useState(null)
  const [historique, setHistorique]   = useState([])

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

  useEffect(() => { load() }, [load])

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditVal({ prix_base_fcfa: p.prix_base_fcfa, prix_max_fcfa: p.prix_max_fcfa || '', est_actif: p.est_actif, raison: '' })
  }

  const cancelEdit = () => { setEditingId(null); setEditVal({}) }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await api.put(`/admin/prix/${id}`, editVal)
      toast.success('Prix mis à jour')
      setEditingId(null)
      setProduits(prev => prev.map(p => p.id === id ? {...p, ...editVal} : p))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setSaving(false) }
  }

  const loadHistorique = async (p) => {
    setHistProduit(p)
    const { data } = await api.get(`/admin/prix/${p.id}/historique`)
    setHistorique(data)
    setHistModal(true)
  }

  const bulkUpdate = async () => {
    if (!bulk.valeur && bulk.valeur !== 0) { toast.error('Valeur requise'); return }
    setBulkSaving(true)
    try {
      const { data } = await api.post('/admin/prix/bulk-update', bulk)
      toast.success(`${data.mis_a_jour} produit(s) mis à jour !`)
      setBulkModal(false)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setBulkSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            {SECTIONS.map(s => <option key={s.code} value={s.code}>{s.emoji} {s.label}</option>)}
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
              {produits.map(p => {
                const isEditing = editingId === p.id
                return (
                  <div key={p.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 items-center text-sm hover:bg-gray-50/70 transition-colors ${!p.est_actif ? 'opacity-50' : ''}`}>

                    {/* Nom */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {p.image_url && <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover"/>}
                      </div>
                      <span className="font-medium text-[#0D2137] truncate text-xs">{p.nom}</span>
                    </div>

                    {/* Section */}
                    <div className="col-span-2 text-center">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.section_code}</span>
                    </div>

                    {/* Prix de base */}
                    <div className="col-span-2 text-right">
                      {isEditing ? (
                        <input type="number" min="0"
                          className="w-full border border-amber-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:border-amber-500 bg-amber-50"
                          value={editVal.prix_base_fcfa}
                          onChange={e => setEditVal(v=>({...v, prix_base_fcfa: parseInt(e.target.value)||0}))}/>
                      ) : (
                        <span className="font-bold text-amber-600 text-sm">{(p.prix_base_fcfa||0).toLocaleString()} F</span>
                      )}
                    </div>

                    {/* Prix max */}
                    <div className="col-span-2 text-right">
                      {isEditing ? (
                        <input type="number" min="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none bg-white"
                          placeholder="–"
                          value={editVal.prix_max_fcfa}
                          onChange={e => setEditVal(v=>({...v, prix_max_fcfa: e.target.value ? parseInt(e.target.value) : ''}))}/>
                      ) : (
                        <span className="text-xs text-gray-400">{p.prix_max_fcfa ? p.prix_max_fcfa.toLocaleString() + ' F' : '—'}</span>
                      )}
                    </div>

                    {/* Actif */}
                    <div className="col-span-1 flex justify-center">
                      {isEditing ? (
                        <button onClick={() => setEditVal(v=>({...v, est_actif: !v.est_actif}))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${editVal.est_actif ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          {editVal.est_actif ? '✓' : '×'}
                        </button>
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${p.est_actif ? 'bg-green-400' : 'bg-gray-300'}`}/>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(p.id)} disabled={saving}
                            className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center transition-colors">
                            {saving ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"/> : <Check size={11}/>}
                          </button>
                          <button onClick={cancelEdit}
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center transition-colors">
                            <X size={11}/>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(p)}
                            className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center transition-colors">
                            <Edit2 size={11}/>
                          </button>
                          <button onClick={() => loadHistorique(p)}
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center transition-colors">
                            <BarChart2 size={11}/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
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
                  {SECTIONS.map(s => <option key={s.code} value={s.code}>{s.emoji} {s.label}</option>)}
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
                    ? `Exemple : 10 = +10%, -5 = baisser de 5%`
                    : `Exemple : 200 = ajouter 200 FCFA, -100 = réduire de 100 F`}
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
    </div>
  )
}
