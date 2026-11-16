import { useEffect, useState, Suspense, lazy } from 'react'
import { Search, Store, Plus, Pencil, Trash2, X, MapPin, Phone, Users, ShoppingBag, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'
import { useConfirm } from '../components/common/useConfirm'

// Carte chargée à la demande (Leaflet ~150ko — hors du bundle principal)
const MarcheMapPicker = lazy(() => import('../components/common/MarcheMapPicker'))

const VIDE = { nom: '', ville: '', quartier: '', adresse: '', telephone: '', latitude: null, longitude: null }

export default function AdminPointsAchat() {
  const [points, setPoints] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchAll = () => {
    setLoading(true)
    api.get('/admin/points-achat', { params: search ? { q: search } : {} })
      .then(r => setPoints(r.data))
      .catch(e => setErreur(e?.response?.data?.detail || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { const t = setTimeout(fetchAll, 300); return () => clearTimeout(t) }, [search])

  const [geoSearch, setGeoSearch] = useState('')
  const [geoResults, setGeoResults] = useState([])
  const [geoLoading, setGeoLoading] = useState(false)

  // Recherche d'adresse via Nominatim (OpenStreetMap — gratuit, sans clé)
  const rechercherAdresse = async () => {
    if (!geoSearch.trim()) return
    setGeoLoading(true); setGeoResults([])
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=cm&limit=5&q=${encodeURIComponent(geoSearch)}`,
        { headers: { 'Accept-Language': 'fr' } })
      setGeoResults(await r.json())
    } catch { setGeoResults([]) }
    finally { setGeoLoading(false) }
  }

  const choisirResultat = (r) => {
    const addr = r.address || {}
    setModal(m => ({ ...m, data: { ...m.data,
      latitude: parseFloat(r.lat), longitude: parseFloat(r.lon),
      ville: m.data.ville || addr.city || addr.town || addr.village || '',
      quartier: m.data.quartier || addr.suburb || addr.neighbourhood || addr.quarter || '',
      adresse: m.data.adresse || r.display_name,
    }}))
    setGeoResults([]); setGeoSearch('')
  }

  const pickMap = (lat, lon) =>
    setModal(m => ({ ...m, data: { ...m.data, latitude: +lat.toFixed(6), longitude: +lon.toFixed(6) } }))

  const sauver = async (e) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    try {
      const d = modal.data
      const payload = { nom: d.nom, ville: d.ville || null, quartier: d.quartier || null,
                        adresse: d.adresse || null, telephone: d.telephone || null,
                        latitude: d.latitude ?? null, longitude: d.longitude ?? null }
      if (modal.mode === 'create') {
        await api.post('/admin/points-achat', payload)
        setOk('Point d\'achat créé')
      } else {
        await api.put(`/admin/points-achat/${d.id}`, payload)
        setOk('Point d\'achat mis à jour')
      }
      setModal(null); fetchAll()
    } catch (e2) {
      setErreur(e2?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    } finally { setSaving(false) }
  }

  const supprimer = async (p) => {
    if (!await confirm({
      titre: 'Supprimer ce point d\'achat ?',
      message: `${p.nom} (${p.ville || ''}). Si des agents ou commandes y sont rattachés, il sera seulement désactivé.`,
      confirmLabel: 'Supprimer', danger: true,
    })) return
    try {
      const r = await api.delete(`/admin/points-achat/${p.id}`)
      setOk(r.data?.message || 'Point d\'achat supprimé'); fetchAll()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur de suppression') }
  }

  const toggleActif = async (p) => {
    try {
      await api.put(`/admin/points-achat/${p.id}`, { actif: !p.actif })
      fetchAll()
    } catch (e) { setErreur(e?.response?.data?.detail || 'Erreur') }
  }

  return (
    <AdminLayout title="Points d'achat">
      {ConfirmDialog}
      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{erreur}<button onClick={() => setErreur('')} className="font-bold ml-4">&times;</button></div>}
      {ok && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm flex justify-between">{ok}<button onClick={() => setOk('')} className="font-bold ml-4">&times;</button></div>}

      <div className="bg-white rounded-2xl shadow-sm mb-6 p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <p className="text-gray-500 text-sm"><span className="font-bold text-navy">{points.length}</span> point{points.length > 1 ? 's' : ''} d'achat — marchés où les agents préparent les commandes</p>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher nom, ville, quartier..."
              className="input pl-9 !py-2 !text-xs w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setModal({ mode: 'create', data: { ...VIDE } })}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue transition-colors shrink-0">
            <Plus size={16} /> Nouveau marché
          </button>
        </div>
      </div>

      {/* Cartes */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : points.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-gray-400">
          <Store size={40} className="mx-auto mb-3 opacity-30" />Aucun point d'achat
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {points.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm border p-5 transition-shadow hover:shadow-md ${p.actif ? 'border-gray-100' : 'border-red-100 opacity-75'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.actif ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy">{p.nom}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} />{[p.quartier, p.ville].filter(Boolean).join(', ') || 'Localisation non renseignée'}
                    </p>
                  </div>
                </div>
                <button onClick={() => toggleActif(p)} title={p.actif ? 'Désactiver' : 'Activer'}
                  className={p.actif ? 'text-green-500' : 'text-gray-300'}>
                  {p.actif ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
              </div>

              <div className="flex gap-4 text-xs text-gray-500 mb-4 flex-wrap">
                <span className="flex items-center gap-1"><Users size={12} className="text-blue" />{p.nb_agents} agent{p.nb_agents > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><ShoppingBag size={12} className="text-amber" />{p.nb_commandes} commande{p.nb_commandes > 1 ? 's' : ''}</span>
                {p.telephone && <span className="flex items-center gap-1"><Phone size={12} />{p.telephone}</span>}
                {p.latitude != null && p.longitude != null && (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold"><MapPin size={12} />Localisé</span>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setModal({ mode: 'edit', data: { ...p } })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition-colors">
                  <Pencil size={12} /> Modifier
                </button>
                <button onClick={() => supprimer(p)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-navy text-xl">{modal.mode === 'create' ? 'Nouveau point d\'achat' : 'Modifier le point d\'achat'}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={sauver} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du marché *</label>
                <input required className="input" placeholder="Ex : Marché Central" value={modal.data.nom}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, nom: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Ville</label>
                  <input className="input" placeholder="Yaoundé" value={modal.data.ville || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, ville: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Quartier</label>
                  <input className="input" placeholder="Centre-ville" value={modal.data.quartier || ''}
                    onChange={e => setModal(m => ({ ...m, data: { ...m.data, quartier: e.target.value } }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Adresse</label>
                <input className="input" value={modal.data.adresse || ''}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, adresse: e.target.value } }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Téléphone</label>
                <input className="input" placeholder="+237..." value={modal.data.telephone || ''}
                  onChange={e => setModal(m => ({ ...m, data: { ...m.data, telephone: e.target.value } }))} />
              </div>

              {/* ── LOCALISATION ── */}
              <div className="border-t border-gray-100 pt-3">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <MapPin size={12} /> Localisation du marché
                  <span className="font-normal text-gray-400">(pour le tri « plus proches » des livreurs)</span>
                </label>

                {/* Recherche par nom/adresse */}
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9 !text-xs" placeholder="Rechercher le marché (ex : Mokolo, Deïdo...)"
                    value={geoSearch}
                    onChange={e => setGeoSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); rechercherAdresse() } }} />
                  <button type="button" onClick={rechercherAdresse} disabled={geoLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-navy text-white px-2 py-1 rounded-lg hover:bg-blue disabled:opacity-50">
                    {geoLoading ? <Loader2 size={10} className="animate-spin" /> : 'Chercher'}
                  </button>
                </div>
                {geoResults.length > 0 && (
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 mb-2 max-h-32 overflow-y-auto">
                    {geoResults.map(r => (
                      <button key={r.place_id} type="button" onClick={() => choisirResultat(r)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors">
                        <span className="font-semibold text-navy">{r.display_name.split(',')[0]}</span>
                        <span className="text-gray-400"> — {r.display_name.split(',').slice(1, 3).join(',')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Carte cliquable */}
                <Suspense fallback={<div className="h-[220px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs"><Loader2 size={16} className="animate-spin mr-2" />Chargement de la carte…</div>}>
                  <MarcheMapPicker
                    position={modal.data.latitude && modal.data.longitude ? [modal.data.latitude, modal.data.longitude] : null}
                    onPick={pickMap} />
                </Suspense>
                <p className="text-[10px] text-gray-400 mt-1">Cliquez sur la carte ou glissez le marqueur pour placer le marché</p>

                {/* Coordonnées manuelles */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-0.5 block">Latitude</label>
                    <input type="number" step="0.000001" className="input !text-xs !py-1.5"
                      value={modal.data.latitude ?? ''}
                      onChange={e => setModal(m => ({ ...m, data: { ...m.data, latitude: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-0.5 block">Longitude</label>
                    <input type="number" step="0.000001" className="input !text-xs !py-1.5"
                      value={modal.data.longitude ?? ''}
                      onChange={e => setModal(m => ({ ...m, data: { ...m.data, longitude: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-blue disabled:opacity-50">
                  {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
