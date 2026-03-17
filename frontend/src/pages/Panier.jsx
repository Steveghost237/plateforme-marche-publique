import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, MapPin, Clock, CreditCard, Check, Heart, ChevronRight, Star, Weight, RefreshCw, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { usePanier, useAuth } from '../store'

const SECTION_ICONS = {
  menus_ingredients: '🥘', fruits: '🍊', boissons: '🥤', boulangerie: '🍞', epices: '🌶️'
}

function SafeImg({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className={`${className} bg-amber-50 flex items-center justify-center text-2xl`}>🍽️</div>
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}

// ── PANIER ────────────────────────────────────────────────────
export function Panier() {
  const { lignes, setQty, remove } = usePanier(s => ({
    lignes: s.lignes, setQty: s.setQty, remove: s.remove
  }))

  const sousTotal = lignes.reduce((a, l) => a + l.prixUnit * l.quantite, 0)
  const fraisLiv  = sousTotal >= 5000 ? 0 : 500
  const total     = sousTotal + fraisLiv
  const points    = Math.floor(total / 500)

  // Grouper par section
  const grouped = lignes.reduce((acc, l) => {
    const sec = l.produit.section?.code || 'autres'
    if (!acc[sec]) acc[sec] = { label: l.produit.section?.nom || 'Autres', lignes: [] }
    acc[sec].lignes.push(l)
    return acc
  }, {})

  if (lignes.length === 0) return (
    <div className="min-h-screen bg-[#F5EFE6] flex flex-col items-center justify-center gap-5 px-6">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
        <ShoppingCart size={40} className="text-gray-200"/>
      </div>
      <h2 className="font-serif text-[#0D2137] text-2xl font-bold">Panier vide</h2>
      <p className="text-gray-400 text-sm text-center">Aucun article pour l'instant.<br/>Explorez notre catalogue de produits camerounais !</p>
      <Link to="/catalogue/menus_ingredients"
        className="bg-[#0D2137] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-amber-400 hover:text-gray-900 transition-all">
        <ShoppingCart size={16}/> Explorer le catalogue
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-white font-bold text-2xl">🛒 Mon Panier</h1>
            <p className="text-white/50 text-xs mt-0.5">{lignes.length} article{lignes.length>1?'s':''} · {Object.keys(grouped).length} section{Object.keys(grouped).length>1?'s':''}</p>
          </div>
          <Link to="/catalogue/menus_ingredients"
            className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors">
            + Continuer mes achats
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* Articles groupés par section */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(grouped).map(([sec, { label, lignes: items }]) => (
            <div key={sec} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Header section */}
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <span className="text-base">{SECTION_ICONS[sec] || '📦'}</span>
                <span className="text-xs font-bold text-[#0D2137] uppercase tracking-wide">{label}</span>
                <span className="ml-auto text-xs text-gray-400">{items.length} article{items.length>1?'s':''}</span>
              </div>
              {/* Items */}
              <div className="divide-y divide-gray-50">
                {items.map(l => (
                  <div key={l.produit.id} className="p-4 flex gap-3 items-start">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <SafeImg src={l.produit.image_url} alt={l.produit.nom} className="w-full h-full object-cover"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0D2137] text-sm truncate">{l.produit.nom}</h3>
                      {l.ingredients?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">✏️ {l.ingredients.length} ingrédient(s) personnalisé(s)</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setQty(l.produit.id, l.quantite - 1)}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <Minus size={11}/>
                          </button>
                          <span className="font-bold text-[#0D2137] w-6 text-center text-sm">{l.quantite}</span>
                          <button onClick={() => setQty(l.produit.id, l.quantite + 1)}
                            className="w-7 h-7 rounded-full bg-[#0D2137] text-white hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all">
                            <Plus size={11}/>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 font-bold text-sm">{(l.prixUnit * l.quantite).toLocaleString()} F</span>
                          <button onClick={() => remove(l.produit.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Enregistrer le panier */}
          <button className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-4 text-gray-400 text-sm font-medium hover:border-[#0D2137] hover:text-[#0D2137] transition-colors flex items-center justify-center gap-2">
            <Heart size={15}/> Enregistrer ce panier comme liste favorite
          </button>
        </div>

        {/* Récapitulatif sticky */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-24">
            <h3 className="font-bold text-[#0D2137] text-sm mb-4 pb-3 border-b border-gray-100">Récapitulatif commande</h3>

            {/* Mini-liste */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {lignes.map(l => (
                <div key={l.produit.id} className="flex justify-between text-xs text-gray-600">
                  <span className="truncate flex-1">{l.produit.nom} ×{l.quantite}</span>
                  <span className="font-semibold ml-2 shrink-0">{(l.prixUnit*l.quantite).toLocaleString()} F</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total ({lignes.length} art.)</span>
                <span>{sousTotal.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Frais de livraison</span>
                {fraisLiv === 0
                  ? <span className="text-green-500 font-semibold">Offerte 🎉</span>
                  : <span>{fraisLiv.toLocaleString()} F</span>}
              </div>
              {fraisLiv > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                  <Check size={11}/> Livraison offerte dès 5 000 F
                  <span className="ml-auto font-semibold">{(5000-sousTotal).toLocaleString()} F restants</span>
                </div>
              )}
              {/* Points */}
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                <Star size={11} fill="currentColor"/> +{points} points fidélité gagnés
              </div>
              <div className="flex justify-between font-bold text-[#0D2137] pt-2 border-t border-gray-100 text-base">
                <span>Total</span>
                <span className="text-amber-500">{total.toLocaleString()} F</span>
              </div>
            </div>

            <Link to="/commande"
              className="w-full mt-4 bg-[#0D2137] hover:bg-amber-400 hover:text-gray-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow">
              Passer la commande <ArrowRight size={15}/>
            </Link>
            <Link to="/catalogue/menus_ingredients"
              className="w-full mt-2 border border-gray-200 text-gray-500 hover:border-[#0D2137] hover:text-[#0D2137] font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs">
              + Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CHECKOUT ─────────────────────────────────────────────────
export function Checkout() {
  const { lignes, clear } = usePanier(s => ({ lignes: s.lignes, clear: s.clear }))
  const sousTotal = lignes.reduce((a,l)=>a+l.prixUnit*l.quantite,0)
  const { isAuth, user } = useAuth()
  const navigate = useNavigate()

  const [adresses, setAdresses] = useState([])
  const [step, setStep] = useState(1)
  const [sel, setSel]   = useState({ adresseId: null, creneau: null, date: '', mode: 'mtn_mobile_money', tel: '' })
  const [poidsKg, setPoidsKg]         = useState(0)
  const [fraisInfo, setFraisInfo]     = useState(null)   // résultat API /zones-livraison/calcul
  const [fraisLoading, setFraisLoading] = useState(false)
  const [cmdNumero, setCmdNumero]     = useState('')
  const [lignesSnap, setLignesSnap]   = useState([])
  const [loading, setLoading]         = useState(false)
  const [newAdr, setNewAdr]           = useState({ quartier:'', ville:'Yaoundé', libelle:'Domicile' })
  const [showNewAdr, setShowNewAdr]   = useState(false)

  // Frais calculés dynamiquement (formule combinée distance + poids)
  const fraisLiv = sousTotal >= 5000 ? 0 : (fraisInfo ? (fraisInfo.frais_total ?? fraisInfo.frais_fcfa ?? 500) : 500)
  const total    = sousTotal + fraisLiv
  const points   = Math.floor(total / 500)

  useEffect(() => {
    if (!isAuth) { navigate('/connexion'); return }
    if (lignes.length === 0) { navigate('/panier'); return }
    api.get('/adresses/').then(r => { setAdresses(r.data); if (r.data.length > 0) setSel(s => ({...s, adresseId: r.data[0].id})) }).catch(() => {})
  }, [isAuth])

  // Recalcul automatique à chaque changement d'adresse ou de poids
  const recalcFrais = useCallback(async (adresseId, kg) => {
    if (!adresseId) return
    setFraisLoading(true)
    try {
      const { data } = await api.post('/zones-livraison/calcul', { adresse_id: adresseId, poids_kg: kg })
      setFraisInfo(data)
    } catch { /* garde le tarif par défaut */ }
    finally { setFraisLoading(false) }
  }, [])

  useEffect(() => {
    if (sel.adresseId) recalcFrais(sel.adresseId, poidsKg)
  }, [sel.adresseId, poidsKg])

  const addAdresse = async () => {
    try {
      const { data } = await api.post('/adresses/', newAdr)
      setAdresses(a => [...a, data])
      setSel(s => ({...s, adresseId: data.id}))
      setShowNewAdr(false)
      toast.success('Adresse ajoutée')
    } catch { toast.error('Erreur lors de l\'ajout') }
  }

  const passer = async () => {
    setLoading(true)
    try {
      const payload = {
        adresse_id: sel.adresseId,
        creneau: sel.creneau,
        date_livraison: sel.date,
        mode_paiement: sel.mode,
        telephone_paiement: sel.tel || user?.telephone,
        poids_estime_kg: poidsKg,
        lignes: lignes.map(l => ({
          produit_id: l.produit.id,
          section_id: l.produit.section?.id,
          quantite: l.quantite,
          prix_unitaire: l.prixUnit,
          ingredients: l.ingredients?.map(i => ({ingredient_id: i.ingredient_id, quantite: i.quantite, unite: i.unite, prix_choisi: i.prix_choisi})) || [],
        }))
      }
      const { data: cmd } = await api.post('/commandes/', payload)
      // Confirmer paiement (simulation)
      await api.post(`/commandes/${cmd.id}/payer`)
      setCmdNumero(cmd.numero)
      setLignesSnap(lignes)
      clear()
      setStep(4)
    } catch(err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la commande')
    } finally { setLoading(false) }
  }

  const CRENEAUX = [
    { val:'matin_8h_10h',  label:'Matin',  time:'8h – 10h', emoji:'🌅' },
    { val:'midi_12h_14h',  label:'Midi',   time:'12h – 14h',emoji:'☀️' },
    { val:'soir_17h_19h',  label:'Soir',   time:'17h – 19h',emoji:'🌆' },
  ]
  const MODES = [
    { val:'mtn_mobile_money', label:'MTN Mobile Money', emoji:'🟡' },
    { val:'orange_money',     label:'Orange Money',     emoji:'🟠' },
    { val:'especes',          label:'Espèces à la livraison', emoji:'💵' },
  ]

  if (step === 4) return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm">
        {/* En-tête confirmation */}
        <div className="bg-[#0D2137] rounded-t-2xl px-6 py-6 text-center">
          <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={30} className="text-white"/>
          </div>
          <h2 className="text-white font-bold text-xl">Commande confirmée !</h2>
          <p className="text-amber-400 font-bold text-lg mt-1">{cmdNumero}</p>
        </div>

        {/* FACTURE */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Facture</p>

          {/* Lignes produits */}
          <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
            {lignesSnap.map(l => (
              <div key={l.produit?.id || Math.random()} className="flex justify-between text-xs text-gray-600">
                <span className="truncate flex-1">{l.produit?.nom} <span className="text-gray-400">×{l.quantite}</span></span>
                <span className="font-semibold ml-2 shrink-0">{(l.prixUnit * l.quantite).toLocaleString()} F</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-2 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total produits</span>
              <span>{sousTotal.toLocaleString()} F</span>
            </div>

            {/* Détail livraison */}
            {fraisLiv === 0 ? (
              <div className="flex justify-between text-sm text-green-600 font-semibold">
                <span>Livraison</span><span>Offerte 🎉</span>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-xl p-2.5 space-y-1">
                <p className="text-[10px] font-bold text-blue-600 mb-1">
                  Livraison {fraisInfo?.zone_nom ? `— ${fraisInfo.zone_nom}` : ''}
                  {fraisInfo?.distance_km ? ` (${fraisInfo.distance_km} km)` : ''}
                </p>
                {fraisInfo?.frais_base > 0 && (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Prise en charge</span><span>{fraisInfo.frais_base.toLocaleString()} F</span>
                  </div>
                )}
                {fraisInfo?.part_distance > 0 && (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>{fraisInfo.distance_km} km × {fraisInfo.prix_par_km} F/km</span>
                    <span>{fraisInfo.part_distance.toLocaleString()} F</span>
                  </div>
                )}
                {(fraisInfo?.part_poids || 0) > 0 && (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>{poidsKg} kg × {fraisInfo.prix_par_kg} F/kg</span>
                    <span>{fraisInfo.part_poids.toLocaleString()} F</span>
                  </div>
                )}
                {(fraisInfo?.majoration || 0) > 0 && (
                  <div className="flex justify-between text-[10px] text-amber-600">
                    <span>Pointe Lun–Ven (+{fraisInfo.majoration_pct}%)</span>
                    <span>+{fraisInfo.majoration.toLocaleString()} F</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-[#0D2137] pt-1 border-t border-blue-200">
                  <span>Total livraison</span>
                  <span>{fraisLiv.toLocaleString()} F</span>
                </div>
              </div>
            )}

            {/* TOTAL */}
            <div className="flex justify-between font-bold text-[#0D2137] text-lg pt-2 border-t-2 border-[#0D2137]/10">
              <span>TOTAL</span>
              <span className="text-amber-500">{total.toLocaleString()} F</span>
            </div>
          </div>

          <div className="mt-3 bg-amber-50 rounded-xl p-2.5 text-xs text-amber-700 text-center">
            ⭐ +{points} points fidélité crédités à la livraison
          </div>
          <div className="mt-2 bg-blue-50 rounded-xl p-2.5 text-xs text-blue-700 text-center">
            🛵 Votre livreur se rend au marché — vous serez notifié à chaque étape
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <Link to="/commandes" className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all text-center">
            Suivre ma commande
          </Link>
          <Link to="/" className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137] transition-all text-center">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-white font-bold text-xl">Finaliser la commande</h1>
          {/* Stepper */}
          <div className="flex items-center gap-0 mt-4">
            {[['📍','Adresse'],['🕐','Créneau'],['💳','Paiement']].map(([emoji, label], i) => (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all
                  ${step === i+1 ? 'bg-amber-400 text-gray-900' : step > i+1 ? 'bg-green-500 text-white' : 'bg-white/15 text-white/50'}`}>
                  {step > i+1 ? <Check size={10}/> : <span>{emoji}</span>}
                  {label}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > i+1 ? 'bg-green-400' : 'bg-white/20'}`}/>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* ÉTAPE 1 : ADRESSE */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-[#0D2137] text-base mb-4 flex items-center gap-2"><MapPin size={16} className="text-amber-500"/> Adresse de livraison</h2>
              {adresses.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {adresses.map(a => (
                    <button key={a.id} onClick={() => setSel(s => ({...s, adresseId: a.id}))}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all
                        ${sel.adresseId === a.id ? 'border-[#0D2137] bg-[#0D2137]/5' : 'border-gray-200 hover:border-[#0D2137]/30'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📍</span>
                        <p className="font-semibold text-[#0D2137] text-sm">{a.libelle}</p>
                        {sel.adresseId === a.id && <Check size={14} className="ml-auto text-[#0D2137]"/>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 pl-5">{a.quartier}, {a.ville}</p>
                    </button>
                  ))}
                </div>
              ) : null}
              {!showNewAdr ? (
                <button onClick={() => setShowNewAdr(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-400 text-sm hover:border-[#0D2137] hover:text-[#0D2137] transition-colors">
                  + Ajouter une adresse
                </button>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" placeholder="Libellé (ex: Domicile)" value={newAdr.libelle} onChange={e => setNewAdr({...newAdr, libelle: e.target.value})}/>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" placeholder="Quartier *" required value={newAdr.quartier} onChange={e => setNewAdr({...newAdr, quartier: e.target.value})}/>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" value={newAdr.ville} onChange={e => setNewAdr({...newAdr, ville: e.target.value})}>
                    <option>Yaoundé</option><option>Douala</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={addAdresse} disabled={!newAdr.quartier} className="flex-1 bg-[#0D2137] text-white text-sm py-2 rounded-xl font-semibold hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">Ajouter</button>
                    <button onClick={() => setShowNewAdr(false)} className="flex-1 border border-gray-200 text-gray-500 text-sm py-2 rounded-xl font-medium">Annuler</button>
                  </div>
                </div>
              )}
              <button onClick={() => setStep(2)} disabled={!sel.adresseId}
                className="w-full mt-4 bg-[#0D2137] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-400 hover:text-gray-900 transition-all text-sm disabled:opacity-40">
                Choisir le créneau <ArrowRight size={15}/>
              </button>
            </div>
          )}

          {/* ÉTAPE 2 : CRÉNEAU + POIDS */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-[#0D2137] text-base mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-500"/> Créneau de livraison</h2>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">📅 Date de livraison</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]" min={new Date().toISOString().split('T')[0]}
                  value={sel.date} onChange={e => setSel(s => ({...s, date: e.target.value}))}/>
              </div>
              <label className="text-xs font-bold text-gray-500 mb-3 block">⏰ Heure de livraison</label>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {CRENEAUX.map(c => (
                  <button key={c.val} onClick={() => setSel(s => ({...s, creneau: c.val}))}
                    className={`py-5 rounded-xl border-2 text-center transition-all
                      ${sel.creneau === c.val ? 'border-[#0D2137] bg-[#0D2137] text-white shadow-md' : 'border-gray-200 hover:border-[#0D2137]/40 text-[#0D2137]'}`}>
                    <div className="text-2xl mb-1">{c.emoji}</div>
                    <div className="font-bold text-sm">{c.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{c.time}</div>
                  </button>
                ))}
              </div>

              {/* Poids estimé */}
              <div className="mb-5 border border-gray-100 rounded-xl p-4 bg-gray-50">
                <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                  ⚖️ Poids estimé de la commande (optionnel)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="0" max="100" step="0.5"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                      placeholder="Ex: 3.5"
                      value={poidsKg || ''} onChange={e => setPoidsKg(parseFloat(e.target.value) || 0)}/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
                  </div>
                  {fraisLoading && <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0D2137] rounded-full animate-spin shrink-0"/>}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Une estimation du poids total permet de calculer les frais de livraison précis. Laissez à 0 pour le tarif standard.</p>
                {fraisInfo && fraisInfo.prix_par_kg > 0 && poidsKg > 0 && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    {poidsKg} kg × {fraisInfo.prix_par_kg} F/kg = +{(fraisInfo.part_poids||0).toLocaleString()} F de supplément
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-500 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137] transition-colors">← Retour</button>
                <button onClick={() => setStep(3)} disabled={!sel.creneau || !sel.date}
                  className="flex-2 flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                  Paiement <ArrowRight size={14}/>
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PAIEMENT */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-[#0D2137] text-base mb-4 flex items-center gap-2"><CreditCard size={16} className="text-amber-500"/> Mode de paiement</h2>
              <div className="space-y-3 mb-5">
                {MODES.map(m => (
                  <button key={m.val} onClick={() => setSel(s => ({...s, mode: m.val}))}
                    className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-3 transition-all
                      ${sel.mode === m.val ? 'border-[#0D2137] bg-[#0D2137]/5 shadow-sm' : 'border-gray-200 hover:border-[#0D2137]/30'}`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-[#0D2137] text-sm">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.val === 'especes' ? 'Payez à la réception' : 'Paiement instantané'}</p>
                    </div>
                    {sel.mode === m.val && <Check size={16} className="text-[#0D2137] shrink-0"/>}
                  </button>
                ))}
              </div>
              {sel.mode !== 'especes' && (
                <div className="mb-5">
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Numéro Mobile Money</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="6XX XXX XXX" value={sel.tel} onChange={e => setSel(s => ({...s, tel: e.target.value}))}/>
                </div>
              )}
              <div className="bg-green-50 rounded-xl p-3 mb-4 text-xs text-green-700">
                🔒 Paiement 100% sécurisé · Données chiffrées
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-500 font-medium py-3 rounded-xl text-sm">← Retour</button>
                <button onClick={passer} disabled={loading}
                  className="flex-2 flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>✅ Confirmer & Payer</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Récap sticky */}
        <div className="bg-white rounded-2xl shadow-sm p-5 h-fit sticky top-4">
          <h3 className="font-bold text-[#0D2137] text-sm mb-3 pb-3 border-b border-gray-100">Votre commande</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {lignes.map(l => (
              <div key={l.produit.id} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate flex-1">{l.produit.nom} ×{l.quantite}</span>
                <span className="font-semibold text-[#0D2137] ml-2 shrink-0">{(l.prixUnit*l.quantite).toLocaleString()} F</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Sous-total</span><span>{sousTotal.toLocaleString()} F</span>
            </div>

            {/* Frais livraison avec détail */}
            <div className="flex justify-between text-gray-500">
              <span className="flex items-center gap-1">
                Livraison
                {fraisLoading && <div className="w-3 h-3 border border-gray-300 border-t-[#0D2137] rounded-full animate-spin"/>}
              </span>
              {sousTotal >= 5000
                ? <span className="text-green-500 font-semibold">Offerte 🎉</span>
                : <span className={fraisInfo ? 'text-[#0D2137] font-semibold' : ''}>{fraisLiv.toLocaleString()} F</span>
              }
            </div>

            {/* Facture livraison détaillée */}
            {fraisInfo && sousTotal < 5000 && (
              <div className="border border-blue-100 rounded-xl overflow-hidden">
                <div className="bg-blue-600 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white text-[10px] font-bold">
                    {fraisInfo.zone_nom || 'Livraison'}
                  </span>
                  {fraisInfo.distance_km && (
                    <span className="text-white/70 text-[10px]">{fraisInfo.distance_km} km · {fraisInfo.delai_min}–{fraisInfo.delai_max} min</span>
                  )}
                </div>
                <div className="bg-blue-50 px-3 py-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Prise en charge</span>
                    <span>{(fraisInfo.frais_base||0).toLocaleString()} F</span>
                  </div>
                  {fraisInfo.distance_km > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{fraisInfo.distance_km} km × {fraisInfo.prix_par_km} F/km</span>
                      <span>{(fraisInfo.part_distance||0).toLocaleString()} F</span>
                    </div>
                  )}
                  {(fraisInfo.part_poids||0) > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{poidsKg} kg × {fraisInfo.prix_par_kg} F/kg</span>
                      <span>{(fraisInfo.part_poids).toLocaleString()} F</span>
                    </div>
                  )}
                  {(fraisInfo.majoration||0) > 0 && (
                    <div className="flex justify-between text-[10px] text-amber-600">
                      <span className="flex items-center gap-1"><Zap size={8}/> Pointe Lun–Ven (+{fraisInfo.majoration_pct}%)</span>
                      <span>+{(fraisInfo.majoration).toLocaleString()} F</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#0D2137] text-xs pt-1 border-t border-blue-200">
                    <span>Total livraison</span>
                    <span>{(fraisInfo.frais_total||fraisInfo.frais_fcfa||0).toLocaleString()} F</span>
                  </div>
                </div>
              </div>
            )}

            {sousTotal < 5000 && (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                <Check size={11}/> Livraison offerte dès 5 000 F
                <span className="ml-auto font-semibold">{(5000-sousTotal).toLocaleString()} F restants</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-[#0D2137] text-base pt-2 border-t border-gray-100">
              <span>Total</span><span className="text-amber-500">{total.toLocaleString()} F</span>
            </div>
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">⭐ +{points} pts fidélité</div>
          </div>
        </div>
      </div>
    </div>
  )
}
