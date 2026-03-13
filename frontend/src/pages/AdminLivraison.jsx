import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus, Edit2, Trash2, X, Check, MapPin, Truck, Clock, Zap, Calculator } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const COULEURS = [
  { hex: '#22C55E', label: 'Vert' },
  { hex: '#3B82F6', label: 'Bleu' },
  { hex: '#F59E0B', label: 'Orange' },
  { hex: '#EF4444', label: 'Rouge' },
  { hex: '#8B5CF6', label: 'Violet' },
  { hex: '#6B7280', label: 'Gris' },
]

const ZONE_DEFAUT = {
  nom: '', ville: 'Yaoundé',
  distance_min_km: 0, distance_max_km: '',
  frais_base_fcfa: 200,
  prix_par_km_fcfa: 50,
  prix_par_kg_fcfa: 100,
  majoration_pointe_pct: 20,
  delai_min: 30, delai_max: 60,
  couleur_hex: '#3B82F6', ordre: 0, actif: true,
}

// Calcul local pour la prévisualisation dans le formulaire
function simulerLocal(f, distKm = 5, poidsKg = 2, pointe = false) {
  const base    = parseFloat(f.frais_base_fcfa)  || 0
  const prixKm  = parseFloat(f.prix_par_km_fcfa) || 0
  const prixKg  = parseFloat(f.prix_par_kg_fcfa) || 0
  const majPct  = parseInt(f.majoration_pointe_pct) || 0
  const dist    = parseFloat(distKm) || 0
  const poids   = parseFloat(poidsKg) || 0
  const sousTotal = base + dist * prixKm + poids * prixKg
  const maj     = pointe ? Math.round(sousTotal * majPct / 100) : 0
  return { base, partDist: Math.round(dist * prixKm), partPoids: Math.round(poids * prixKg), maj, total: Math.max(100, Math.round(sousTotal + maj)) }
}

export default function AdminLivraison() {
  const [zones, setZones]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'creer' | 'editer'
  const [form, setForm]       = useState(ZONE_DEFAUT)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Simulateur
  const [simDist, setSimDist]     = useState(5)
  const [simPoids, setSimPoids]   = useState(0)
  const [simPointe, setSimPointe] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [simLoading, setSimLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/zones-livraison/')
      setZones(data)
    } catch { toast.error('Erreur chargement zones') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreer = () => {
    setForm({ ...ZONE_DEFAUT, ordre: zones.length + 1 })
    setModal('creer')
  }

  const openEditer = (z) => {
    setForm({
      nom: z.nom, ville: z.ville,
      distance_min_km: z.distance_min_km ?? 0,
      distance_max_km: z.distance_max_km ?? '',
      frais_base_fcfa: z.frais_base_fcfa ?? 200,
      prix_par_km_fcfa: z.prix_par_km_fcfa ?? 50,
      prix_par_kg_fcfa: z.prix_par_kg_fcfa ?? 100,
      majoration_pointe_pct: z.majoration_pointe_pct ?? 20,
      delai_min: z.delai_min, delai_max: z.delai_max,
      couleur_hex: z.couleur_hex || '#3B82F6',
      ordre: z.ordre ?? 0, actif: z.actif ?? true,
      _id: z.id,
    })
    setModal('editer')
  }

  const saveZone = async () => {
    if (!form.nom.trim()) { toast.error('Nom de zone requis'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        distance_max_km:       form.distance_max_km === '' ? null : parseFloat(form.distance_max_km),
        frais_base_fcfa:       parseInt(form.frais_base_fcfa)  || 200,
        prix_par_km_fcfa:      parseFloat(form.prix_par_km_fcfa) || 50,
        prix_par_kg_fcfa:      parseFloat(form.prix_par_kg_fcfa) || 0,
        majoration_pointe_pct: parseInt(form.majoration_pointe_pct) || 20,
      }
      if (modal === 'creer') {
        await api.post('/admin/zones-livraison/', payload)
        toast.success('Zone créée !')
      } else {
        await api.put(`/admin/zones-livraison/${form._id}`, payload)
        toast.success('Zone mise à jour !')
      }
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setSaving(false) }
  }

  const deleteZone = async (id) => {
    if (!confirm('Supprimer cette zone ?')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/zones-livraison/${id}`)
      toast.success('Zone supprimée')
      setZones(prev => prev.filter(z => z.id !== id))
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setDeleting(null) }
  }

  const simuler = async () => {
    setSimLoading(true)
    try {
      const { data } = await api.post('/admin/zones-livraison/simuler', {
        distance_km: simDist,
        est_pointe: simPointe,
        poids_kg: simPoids,
      })
      setSimResult(data)
    } catch { toast.error('Erreur simulation') }
    finally { setSimLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={18}/>
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">🚚 Zones de Livraison</h1>
            <p className="text-white/50 text-xs">Distance · Poids estimé · Majoration Lun–Ven uniquement</p>
          </div>
          <button onClick={openCreer}
            className="flex items-center gap-2 bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-500 transition-colors shadow-sm">
            <Plus size={14}/> Nouvelle zone
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Info carte */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-blue-500"/>
            </div>
            <div>
              <p className="font-bold text-[#0D2137] text-sm">Point de départ : Marché Mokolo, Yaoundé</p>
              <p className="text-gray-400 text-xs mt-0.5">Lat: 3.8667 · Lon: 11.5167 · Les frais sont calculés selon la distance haversine</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Zap size={10} className="text-amber-500"/> Majoration Lun–Ven : 11h–14h et 18h–22h</span>
                <span className="flex items-center gap-1 text-gray-400">🚫 Pas de majoration le weekend</span>
                <span className="flex items-center gap-1 text-green-600">✓ Livraison offerte ≥ 5 000 FCFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse"/>)}</div>
        ) : zones.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <Truck size={40} className="mx-auto text-gray-200 mb-3"/>
            <p className="text-gray-400">Aucune zone configurée</p>
            <button onClick={openCreer} className="mt-3 bg-[#0D2137] text-white font-bold px-5 py-2.5 rounded-xl text-sm">Créer la première zone</button>
          </div>
        ) : (
          <div className="space-y-3">
            {zones.map(z => (
              <div key={z.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${!z.actif ? 'opacity-50' : ''}`}
                style={{ borderLeftColor: z.couleur_hex || '#6B7280' }}>
                <div className="p-4 flex items-center gap-4">
                  {/* Couleur + nom */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#0D2137] text-sm">{z.nom}</h3>
                      {!z.actif && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactif</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={10}/> {z.distance_min_km ?? 0}–{z.distance_max_km ?? '∞'} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10}/> {z.delai_min}–{z.delai_max} min
                      </span>
                    </div>
                  </div>

                  {/* Prix — formule combinée */}
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-[10px] text-gray-400">{(z.frais_base_fcfa||200).toLocaleString()} + {(z.prix_par_km_fcfa||50)}/km + {(z.prix_par_kg_fcfa||0)}/kg</p>
                    <p className="font-bold text-[#0D2137] text-sm">
                      Ex 5km/2kg : {simulerLocal(z,5,2).total.toLocaleString()} F
                    </p>
                    {(z.majoration_pointe_pct||0) > 0 && (
                      <p className="text-[10px] text-amber-500 flex items-center gap-1 justify-end">
                        <Zap size={8}/> +{z.majoration_pointe_pct}% Lun–Ven
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEditer(z)}
                      className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center transition-colors">
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => deleteZone(z.id)} disabled={deleting === z.id}
                      className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40">
                      {deleting === z.id ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin"/> : <Trash2 size={13}/>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

          {/* Simulateur */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-[#0D2137] text-sm mb-1 flex items-center gap-2">
            <Zap size={15} className="text-amber-400"/> Simulateur de tarif
          </h2>
          <p className="text-xs text-gray-400 mb-4">Formule : <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">frais = base + (km × F/km) + (kg × F/kg)</span> · Majoration % Lun–Ven uniquement</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1.5">Distance (km)</label>
              <input type="number" min="0" max="100" step="0.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                value={simDist} onChange={e => setSimDist(parseFloat(e.target.value)||0)}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1.5">Poids estimé (kg)</label>
              <input type="number" min="0" step="0.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                value={simPoids} onChange={e => setSimPoids(parseFloat(e.target.value)||0)}/>
            </div>
            <div className="flex items-end">
              <button onClick={() => setSimPointe(p => !p)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${simPointe ? 'bg-amber-400 text-gray-900 border-amber-400' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                <Zap size={12} className="inline mr-1"/> Heure pointe (Lun–Ven)
              </button>
            </div>
            <button onClick={simuler} disabled={simLoading}
              className="bg-[#0D2137] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {simLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Calculer'}
            </button>
          </div>

          {simResult && (
            <div className="mt-4 border border-blue-100 rounded-xl overflow-hidden">
              <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
                <span className="text-white font-bold text-sm">Zone : {simResult.zone_nom || simResult.zone || '—'}</span>
                <span className="text-white text-xs">{simResult.delai_min}–{simResult.delai_max} min · {simResult.distance_km} km</span>
              </div>
              <div className="bg-blue-50 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frais de prise en charge</span>
                  <span>{(simResult.frais_base||0).toLocaleString()} F</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Distance : {simResult.distance_km} km × {simResult.prix_par_km} F/km</span>
                  <span>{(simResult.part_distance||0).toLocaleString()} F</span>
                </div>
                {simPoids > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Poids : {simPoids} kg × {simResult.prix_par_kg} F/kg</span>
                    <span>{(simResult.part_poids||0).toLocaleString()} F</span>
                  </div>
                )}
                {simResult.majoration > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span className="flex items-center gap-1"><Zap size={11}/> Heure de pointe Lun–Ven (+{simResult.majoration_pct}%)</span>
                    <span>+{(simResult.majoration||0).toLocaleString()} F</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#0D2137] text-base pt-2 border-t border-blue-200">
                  <span>Total livraison</span>
                  <span className="text-blue-600">{(simResult.frais_total||simResult.frais_fcfa||0).toLocaleString()} F</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Créer / Éditer Zone */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-[#0D2137] rounded-t-2xl p-5 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {modal === 'creer' ? '➕ Nouvelle zone' : '✏️ Modifier la zone'}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/50 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Champs formule combinée */}
              <div className="bg-blue-50 rounded-xl p-3 mb-2">
                <p className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wide">📐 Formule combinée distance + poids</p>
                <p className="text-[10px] text-blue-500 font-mono">frais = base + (km × F/km) + (kg × F/kg) [× (1 + %/100) si pointe Lun–Ven]</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Nom de la zone *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="Ex: Centre-ville (0–3 km)"
                    value={form.nom} onChange={e => setForm(f=>({...f, nom:e.target.value}))}/>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Distance min (km)</label>
                  <input type="number" min="0" step="0.5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.distance_min_km} onChange={e => setForm(f=>({...f, distance_min_km: parseFloat(e.target.value)||0}))}/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Distance max (km) <span className="text-gray-300">vide = illimité</span></label>
                  <input type="number" min="0" step="0.5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="∞"
                    value={form.distance_max_km} onChange={e => setForm(f=>({...f, distance_max_km: e.target.value}))}/>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Frais de base (F) *</label>
                  <input type="number" min="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.frais_base_fcfa} onChange={e => setForm(f=>({...f, frais_base_fcfa: parseInt(e.target.value)||0}))}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Frais fixes de prise en charge</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Tarif / km (F/km)</label>
                  <input type="number" min="0" step="5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.prix_par_km_fcfa} onChange={e => setForm(f=>({...f, prix_par_km_fcfa: parseFloat(e.target.value)||0}))}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ex: 50 → 5 km = +250 F</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Tarif / kg (F/kg)</label>
                  <input type="number" min="0" step="10"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.prix_par_kg_fcfa} onChange={e => setForm(f=>({...f, prix_par_kg_fcfa: parseFloat(e.target.value)||0}))}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ex: 100 → 3 kg = +300 F</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Majoration pointe Lun–Ven (%)</label>
                  <input type="number" min="0" max="100"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.majoration_pointe_pct} onChange={e => setForm(f=>({...f, majoration_pointe_pct: parseInt(e.target.value)||0}))}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ex: 20 = +20% 11h–14h et 18h–22h</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Délai min (min)</label>
                  <input type="number" min="5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.delai_min} onChange={e => setForm(f=>({...f, delai_min: parseInt(e.target.value)||30}))}/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Délai max (min)</label>
                  <input type="number" min="5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.delai_max} onChange={e => setForm(f=>({...f, delai_max: parseInt(e.target.value)||60}))}/>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Ordre d'affichage</label>
                  <input type="number" min="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    value={form.ordre} onChange={e => setForm(f=>({...f, ordre: parseInt(e.target.value)||0}))}/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5">Statut</label>
                  <button onClick={() => setForm(f=>({...f, actif: !f.actif}))}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${form.actif ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {form.actif ? '✓ Active' : '✗ Inactive'}
                  </button>
                </div>
              </div>

              {/* Couleur */}
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2">Couleur de la zone</label>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button key={c.hex} onClick={() => setForm(f=>({...f, couleur_hex:c.hex}))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.couleur_hex === c.hex ? 'border-[#0D2137] scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }} title={c.label}/>
                  ))}
                </div>
              </div>

              {/* Preview formule combinée */}
              {(() => {
                const ex = simulerLocal(form, 5, 2, false)
                const exP = simulerLocal(form, 5, 2, true)
                return (
                  <div className="bg-gray-50 rounded-xl p-3 border-l-4 space-y-1.5" style={{borderLeftColor: form.couleur_hex}}>
                    <p className="text-xs font-bold text-gray-600">{form.nom || 'Prévisualisation zone'} · {form.distance_min_km}–{form.distance_max_km||'∞'} km</p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      frais = {form.frais_base_fcfa||200} + (km × {form.prix_par_km_fcfa||50}) + (kg × {form.prix_par_kg_fcfa||0})
                    </p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">Ex 5km / 2kg :</span>
                      <span className="font-bold text-[#0D2137]">{ex.total.toLocaleString()} F</span>
                      {(form.majoration_pointe_pct||0) > 0 && (
                        <span className="text-amber-500">+{form.majoration_pointe_pct}% pointe → {exP.total.toLocaleString()} F</span>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-2">
                <button onClick={saveZone} disabled={saving}
                  className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={14}/> {modal === 'creer' ? 'Créer la zone' : 'Enregistrer'}</>}
                </button>
                <button onClick={() => setModal(null)} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-colors">
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
