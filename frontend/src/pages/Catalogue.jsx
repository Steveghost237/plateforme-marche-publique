import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, ArrowRight, Plus, Minus, ShoppingCart, ChevronRight, Star, X, Lightbulb, Send, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { usePanier, useAuth } from '../store'

const SECTION_META = {
  menus_ingredients: { label:'Menus & Ingrédients', emoji:'🥘', img:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=1200&q=80&fit=crop', color:'#0D2137',  fallbacks:['https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80&fit=crop'] },
  fruits:            { label:'Fruits & Légumes',    emoji:'🍊', img:'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80&fit=crop', color:'#166534',  fallbacks:['https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1563746924237-f81d91fec822?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&q=80&fit=crop'] },
  boissons:          { label:'Boissons',            emoji:'🥤', img:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200&q=80&fit=crop', color:'#1B4A8A',  fallbacks:['https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80&fit=crop'] },
  boulangerie:       { label:'Boulangerie',         emoji:'🍞', img:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80&fit=crop', color:'#7a3e10',  fallbacks:['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80&fit=crop'] },
  epices:            { label:'Épices & Condiments', emoji:'🌶️', img:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80&fit=crop', color:'#8a1a1a',  fallbacks:['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&q=80&fit=crop'] },
}

function SafeImg({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className={`${className} bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center`}><span className="text-4xl opacity-40">🍽️</span></div>
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />
}

// ── SIDEBAR SECTION NAV ───────────────────────────────────────
function SidebarNav({ current }) {
  return (
    <aside className="hidden lg:flex flex-col w-20 xl:w-56 shrink-0 gap-1">
      {Object.entries(SECTION_META).map(([code, s]) => (
        <Link key={code} to={`/catalogue/${code}`}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
            ${code === current
              ? 'bg-[#0D2137] text-white shadow-md'
              : 'hover:bg-white hover:shadow-sm text-gray-600'}`}>
          <span className="text-xl leading-none shrink-0">{s.emoji}</span>
          <span className="hidden xl:block text-xs font-semibold leading-tight">{s.label}</span>
        </Link>
      ))}
      <div className="mt-4 hidden xl:block bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
        <p className="text-xs font-bold text-amber-700 mb-1">🚚 Livraison</p>
        <p className="text-xs text-amber-600">Offerte dès 5 000 F</p>
        <p className="text-xs text-amber-600 mt-0.5">Yaoundé · Douala</p>
      </div>
    </aside>
  )
}

// ── MODAL SUGGESTION PRODUIT ──────────────────────────────────
function SuggestionModal({ isOpen, onClose, sectionCode }) {
  const { isAuth } = useAuth()
  const [form, setForm] = useState({ nom:'', description:'', prix_suggere_fcfa:'', section_code: sectionCode })
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [votes, setVotes]     = useState(null)

  useEffect(() => { if (isOpen) { setForm(f => ({...f, section_code: sectionCode})); setDone(false); setVotes(null) } }, [isOpen, sectionCode])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nom.trim() || form.nom.trim().length < 2) { toast.error('Nom requis (min 2 caractères)'); return }
    if (!isAuth) { toast.error('Connectez-vous pour suggérer un produit'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/suggestions/', form)
      if (data.is_doublon) {
        setVotes(data.votes)
        toast.success('Votre vote a été ajouté à cette suggestion !')
      } else {
        setDone(true)
        toast.success('Suggestion envoyée ! +100 pts si approuvée')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi')
    } finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0D2137] to-[#1B4A7A] rounded-t-2xl p-5 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-white font-bold text-lg">💡 Suggérer un produit</h2>
            <p className="text-white/60 text-xs mt-0.5">+100 pts fidélité si votre suggestion est approuvée</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={18}/>
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-200">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="font-bold text-[#0D2137] text-lg mb-1">Suggestion envoyée !</h3>
              <p className="text-gray-500 text-sm mb-1">Notre équipe va examiner votre suggestion.</p>
              <p className="text-amber-500 text-sm font-semibold">+100 pts fidélité si approuvée</p>
              <button onClick={onClose} className="mt-4 bg-[#0D2137] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
                Fermer
              </button>
            </div>
          ) : votes !== null ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-blue-200">
                <ThumbsUp size={28} className="text-blue-500"/>
              </div>
              <h3 className="font-bold text-[#0D2137] text-lg mb-1">Vote enregistré !</h3>
              <p className="text-gray-500 text-sm">Ce produit a déjà été suggéré.</p>
              <p className="text-blue-500 font-bold text-lg mt-2">{votes} vote{votes > 1 ? 's' : ''}</p>
              <button onClick={onClose} className="mt-4 bg-[#0D2137] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du produit *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] focus:ring-2 focus:ring-[#0D2137]/10"
                  placeholder="Ex: Okok frais, Ndo'o, Condiment manioc…"
                  value={form.nom} onChange={e => setForm(f=>({...f, nom:e.target.value}))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Description (optionnel)</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] resize-none"
                  placeholder="Décrivez le produit, sa provenance, ses caractéristiques…"
                  value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Prix estimé (FCFA)</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                  placeholder="Ex: 1500"
                  value={form.prix_suggere_fcfa} onChange={e => setForm(f=>({...f, prix_suggere_fcfa: e.target.value ? parseInt(e.target.value) : ''}))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Section</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                  value={form.section_code} onChange={e => setForm(f=>({...f, section_code:e.target.value}))}
                >
                  <option value="menus_ingredients">🥘 Menus & Ingrédients</option>
                  <option value="fruits">🍊 Fruits & Légumes</option>
                  <option value="boissons">🥤 Boissons</option>
                  <option value="boulangerie">🍞 Boulangerie</option>
                  <option value="epices">🌶️ Épices & Condiments</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-amber-700 text-xs font-semibold">💡 Bon à savoir</p>
                <ul className="text-amber-600 text-xs mt-1 space-y-0.5">
                  <li>• Si le produit existe déjà, votre vote est compté</li>
                  <li>• +100 pts fidélité si votre suggestion est retenue</li>
                  <li>• L'admin peut ajuster le nom ou le prix avant publication</li>
                </ul>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Send size={14}/> Envoyer ma suggestion</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LISTE CATALOGUE ───────────────────────────────────────────
export function Catalogue() {
  const { section = 'menus_ingredients' } = useParams()
  const navigate = useNavigate()
  const [produits, setProduits]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [filtre, setFiltre]       = useState('tous')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const meta = SECTION_META[section] || SECTION_META.menus_ingredients

  useEffect(() => {
    setLoading(true); setQ(''); setFiltre('tous')
    api.get(`/catalogue/produits?section=${section}&limit=60`)
      .then(r => setProduits(r.data))
      .catch(() => setProduits([]))
      .finally(() => setLoading(false))
  }, [section])

  const filtered = produits.filter(p => {
    if (q && !p.nom.toLowerCase().includes(q.toLowerCase())) return false
    if (filtre === 'populaire'  && !p.est_populaire) return false
    if (filtre === 'nouveau'    && !p.est_nouveau)   return false
    if (filtre === 'disponible' && !p.stock_dispo)   return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Hero Banner */}
      <div className="relative h-48 overflow-hidden">
        <SafeImg src={meta.img} alt={meta.label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
        <div className="absolute inset-0 flex items-end px-6 pb-5 max-w-7xl mx-auto">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {Object.entries(SECTION_META).map(([code, s]) => (
                <Link key={code} to={`/catalogue/${code}`}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${code===section ? 'bg-amber-400 text-gray-900' : 'bg-white/15 text-white hover:bg-white/30 backdrop-blur-sm'}`}>
                  {s.emoji} {s.label}
                </Link>
              ))}
            </div>
            <h1 className="font-serif text-white font-bold text-2xl md:text-3xl">
              {meta.emoji} {meta.label}
            </h1>
            <p className="text-white/60 text-xs mt-0.5">{produits.length} produits · Marché en ligne Cameroun</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <SidebarNav current={section} />

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Barre recherche + filtres */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] focus:ring-2 focus:ring-[#0D2137]/10 transition"
                placeholder={`Rechercher dans ${meta.label}…`}
                value={q} onChange={e => setQ(e.target.value)}
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13}/>
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[['tous','Tous'],['populaire','⭐ Populaires'],['nouveau','✨ Nouveaux'],['disponible','✅ Dispo']].map(([v,l]) => (
                <button key={v} onClick={() => setFiltre(v)}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${filtre===v ? 'bg-[#0D2137] text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile section tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden scrollbar-none">
            {Object.entries(SECTION_META).map(([code, s]) => (
              <Link key={code} to={`/catalogue/${code}`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors
                  ${code === section ? 'bg-[#0D2137] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                <span>{s.emoji}</span> {s.label}
              </Link>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_,i) => <div key={i} className="bg-white rounded-2xl h-68 animate-pulse"/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl">
              <Search size={40} className="mx-auto text-gray-200 mb-4"/>
              <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
              <button onClick={() => { setQ(''); setFiltre('tous') }}
                className="text-[#1B6CA8] text-sm mt-2 hover:underline">
                Réinitialiser les filtres
              </button>
              <div className="mt-6">
                <p className="text-gray-400 text-sm mb-2">Ce produit n'existe pas encore ?</p>
                <button onClick={() => setSuggestOpen(true)}
                  className="inline-flex items-center gap-2 bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-500 transition-colors">
                  <Lightbulb size={14}/> Suggérer ce produit
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p, i) => (
                  <ProduitCard key={p.id} produit={p} fallback={meta.fallbacks[i % meta.fallbacks.length]} />
                ))}
              </div>
              {/* Bandeau suggestion */}
              <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shrink-0">
                  <Lightbulb size={18} className="text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-800 text-sm">Vous ne trouvez pas ce que vous cherchez ?</p>
                  <p className="text-amber-600 text-xs">Suggérez un produit et gagnez +100 pts si retenu !</p>
                </div>
                <button onClick={() => setSuggestOpen(true)}
                  className="bg-[#0D2137] text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-400 hover:text-gray-900 transition-all shrink-0">
                  Suggérer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal suggestion */}
      <SuggestionModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} sectionCode={section}/>
    </div>
  )
}

function ProduitCard({ produit: p, fallback }) {
  const { add } = usePanier()
  const img = p.image_url || fallback

  const handleAdd = (e) => {
    e.preventDefault()
    if (p.est_menu) return
    add(p, 1, p.prix_base_fcfa)
    toast.success(`${p.nom} ajouté au panier`, { icon:'🛒' })
  }

  return (
    <Link to={`/produit/${p.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
      <div className="relative h-40 overflow-hidden bg-gray-100">
        <SafeImg src={img} alt={p.nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        {!p.stock_dispo && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">Indisponible</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {p.est_populaire && <span className="bg-amber-400 text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">⭐ Pop.</span>}
          {p.est_nouveau   && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">✨ Nouveau</span>}
        </div>
        {p.est_menu && (
          <div className="absolute bottom-2 right-2 bg-[#0D2137]/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full">
            🍽️ Menu
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-[10px] text-gray-400 mb-0.5 truncate">{p.section?.nom}</p>
        <h3 className="font-semibold text-[#0D2137] text-sm leading-snug mb-2.5 line-clamp-2 min-h-[2.5rem]">{p.nom}</h3>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-amber-500 font-bold text-sm">{(p.prix_base_fcfa||0).toLocaleString()} F</span>
            {p.prix_max_fcfa && p.prix_max_fcfa !== p.prix_base_fcfa && (
              <span className="text-gray-300 text-xs ml-1">– {p.prix_max_fcfa.toLocaleString()}</span>
            )}
          </div>
          {p.est_menu ? (
            <span className="flex items-center gap-0.5 text-[#1B6CA8] text-xs font-bold bg-blue-50 px-2 py-1 rounded-lg">
              Composer <ChevronRight size={10}/>
            </span>
          ) : (
            <button onClick={handleAdd} disabled={!p.stock_dispo}
              className="w-8 h-8 bg-[#0D2137] hover:bg-amber-400 hover:text-gray-900 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 shadow-sm">
              <Plus size={14}/>
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── DÉTAIL PRODUIT ─────────────────────────────────────────────
export function ProduitDetail() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const { add }   = usePanier()
  const [produit, setProduit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig]   = useState({})
  const [qty, setQty]         = useState(1)

  useEffect(() => {
    api.get(`/catalogue/produits/${slug}`).then(r => {
      setProduit(r.data)
      const def = {}
      r.data.ingredients?.forEach(ing => {
        def[ing.id] = {
          quantite: Number(ing.quantite_defaut),
          prix: calcPrixCurseur(ing, Number(ing.quantite_defaut))
        }
      })
      setConfig(def)
    }).catch(() => navigate('/catalogue/menus_ingredients'))
      .finally(() => setLoading(false))
  }, [slug])

  function calcPrixCurseur(ing, qte) {
    if (!ing.prix_max_fcfa || !ing.quantite_max) return ing.prix_defaut_fcfa || 0
    const ratio = Math.max(0, Math.min(1, (qte - Number(ing.quantite_min||0)) / (Number(ing.quantite_max) - Number(ing.quantite_min||0))))
    return Math.round((ing.prix_min_fcfa||0) + ratio * ((ing.prix_max_fcfa||0) - (ing.prix_min_fcfa||0)))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#0D2137]/20 border-t-[#0D2137] rounded-full animate-spin"/>
    </div>
  )
  if (!produit) return null

  const sCode    = produit.section?.code || 'menus_ingredients'
  const meta     = SECTION_META[sCode] || SECTION_META.menus_ingredients
  const img      = produit.image_url || meta.fallbacks[0]
  const prixBase = produit.prix_base_fcfa || 0
  const prixIngs = Object.values(config).reduce((a, c) => a + (c.prix || 0), 0)
  const prixUnit = prixBase + prixIngs
  const total    = prixUnit * qty
  const points   = Math.floor(total / 500)

  const updateCurseur = (ing, qte) => {
    const prix = calcPrixCurseur(ing, qte)
    setConfig(c => ({ ...c, [ing.id]: { quantite: qte, prix } }))
  }

  const addToCart = () => {
    const ings = produit.est_menu
      ? produit.ingredients.map(ing => ({
          ingredient_id: ing.id, quantite: config[ing.id]?.quantite || Number(ing.quantite_defaut),
          unite: ing.unite, prix_choisi: config[ing.id]?.prix || 0
        }))
      : []
    add(produit, qty, prixUnit, ings)
    toast.success(`${produit.nom} ajouté au panier !`, { icon:'🛒' })
    navigate('/panier')
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D2137] text-sm mb-6 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform"/>
          Retour au catalogue
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Colonne gauche : photo + badges */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="relative h-72 sm:h-[340px]">
                <SafeImg src={img} alt={produit.nom} className="w-full h-full object-cover" />
                {!produit.stock_dispo && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <span className="bg-white text-gray-700 font-bold px-4 py-2 rounded-full">Temporairement indisponible</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {produit.est_populaire && <span className="bg-amber-400 text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow">⭐ Populaire</span>}
                  {produit.est_nouveau   && <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">✨ Nouveau</span>}
                </div>
                {produit.est_menu && (
                  <div className="absolute bottom-3 left-3 bg-[#0D2137]/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    🍽️ Menu personnalisable
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 font-medium">{produit.section?.nom}</p>
                {produit.description && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{produit.description}</p>
                )}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 mb-2">💡 À savoir</p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Livraison fraîche du marché</li>
                <li>• Ingrédients sélectionnés le matin</li>
                <li>• +{points} points fidélité pour cette commande</li>
              </ul>
            </div>
          </div>

          {/* Colonne droite : personnalisation */}
          <div className="space-y-4">
            <div>
              <h1 className="font-serif text-[#0D2137] font-bold text-2xl md:text-3xl leading-tight">
                {produit.nom}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-amber-500 font-bold text-2xl">{prixBase.toLocaleString()} F</span>
                {produit.prix_max_fcfa && produit.prix_max_fcfa !== prixBase && (
                  <span className="text-gray-400 text-sm">jusqu'à {produit.prix_max_fcfa.toLocaleString()} F</span>
                )}
              </div>
            </div>

            {/* Ingrédients personnalisables */}
            {produit.est_menu && produit.ingredients?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 bg-[#0D2137] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {produit.ingredients.length}
                  </div>
                  <div>
                    <p className="font-bold text-[#0D2137] text-sm">Personnalisez vos ingrédients</p>
                    <p className="text-xs text-gray-400">Ajustez les quantités selon vos besoins</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {produit.ingredients.map(ing => {
                    const curQte  = config[ing.id]?.quantite ?? Number(ing.quantite_defaut)
                    const curPrix = config[ing.id]?.prix ?? (ing.prix_defaut_fcfa || 0)
                    const qMin = Number(ing.quantite_min || 0)
                    const qMax = Number(ing.quantite_max || 99)

                    return (
                      <div key={ing.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-[#0D2137]">{ing.nom}</span>
                              {ing.est_obligatoire
                                ? <span className="text-red-400 text-xs">*</span>
                                : <span className="text-gray-300 text-xs">(opt.)</span>}
                            </div>
                          </div>
                          <span className={`font-bold text-sm ml-3 shrink-0 ${curPrix > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                            {curPrix > 0 ? `+${curPrix.toLocaleString()} F` : 'Inclus'}
                          </span>
                        </div>

                        {ing.type_saisie === 'toggle' ? (
                          <div className="flex gap-2">
                            {[{l:'Oui',v:1},{l:'Non',v:0}].map(o => (
                              <button key={o.l} type="button"
                                onClick={() => setConfig(c => ({...c, [ing.id]: {...c[ing.id], quantite: o.v, prix: o.v > 0 ? (ing.prix_defaut_fcfa||0) : 0}}))}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors
                                  ${curQte === o.v ? 'bg-[#0D2137] border-[#0D2137] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <input type="range"
                              min={qMin} max={qMax}
                              step={
                                ing.unite === 'g' ? 50 : 
                                ing.unite === 'kg' ? 0.1 :
                                ing.unite === 'ml' ? 10 :
                                ing.unite === 'cl' ? 1 : 
                                ing.unite === 'l' ? 0.1 :
                                ing.unite === 'pcs' || ing.unite === 'pièce' || ing.unite === 'piece' ? 1 :
                                ing.unite === 'gousse' || ing.unite === 'cube' || ing.unite === 'feuille' ? 1 :
                                ing.unite === 'pincée' || ing.unite === 'c. à café' || ing.unite === 'c. à soupe' ? 0.5 :
                                ing.unite === 'botte' || ing.unite === 'morceau' ? 1 :
                                qMax <= 10 ? 0.5 : 1
                              }
                              value={curQte}
                              onChange={e => updateCurseur(ing, Number(e.target.value))}
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                              style={{background:`linear-gradient(to right, #0D2137 ${((curQte-qMin)/(qMax-qMin||1))*100}%, #e5e7eb ${((curQte-qMin)/(qMax-qMin||1))*100}%)`}}
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>{qMin} {ing.unite !== 'unite' ? ing.unite : ''}</span>
                              <span className="font-semibold text-[#0D2137]">{curQte} {ing.unite !== 'unite' ? ing.unite : ''}</span>
                              <span>{qMax} {ing.unite !== 'unite' ? ing.unite : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantité + Total */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 text-sm font-medium">Quantité</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q-1))}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <Minus size={14}/>
                  </button>
                  <span className="font-bold text-[#0D2137] text-xl w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(q => q+1)}
                    className="w-9 h-9 rounded-full bg-[#0D2137] text-white hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all">
                    <Plus size={14}/>
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {prixIngs > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Base {prixBase.toLocaleString()} F + options {prixIngs.toLocaleString()} F</span>
                    <span>× {qty}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-500 text-sm font-medium">Total estimé</span>
                    <p className="text-xs text-green-600">+{points} pts fidélité</p>
                  </div>
                  <span className="font-bold text-amber-500 text-3xl">{total.toLocaleString()} F</span>
                </div>
              </div>
            </div>

            <button onClick={addToCart} disabled={!produit.stock_dispo}
              className="w-full bg-[#0D2137] hover:bg-amber-400 hover:text-gray-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 text-sm shadow-lg">
              <ShoppingCart size={18}/> Ajouter au panier — {total.toLocaleString()} F
            </button>
            <p className="text-center text-xs text-gray-400">🔒 Paiement sécurisé · 🚚 Livraison dès 500 F · Yaoundé & Douala</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RECHERCHE ──────────────────────────────────────────────────
export function Recherche() {
  const [q, setQ]          = useState('')
  const [results, setRes]  = useState([])
  const [loading, setLoad] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setRes([]); return }
    const t = setTimeout(() => {
      setLoad(true)
      api.get(`/catalogue/produits?q=${encodeURIComponent(q)}&limit=24`)
        .then(r => setRes(r.data)).catch(() => {})
        .finally(() => setLoad(false))
    }, 380)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <div className="bg-[#0D2137] py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-white font-bold text-3xl mb-6">🔍 Rechercher un produit</h1>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input autoFocus
              className="w-full bg-white rounded-xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition shadow-lg"
              placeholder="ERU, Ndolé, Ananas, Supermont, Mbongo, Njansang…"
              value={q} onChange={e => setQ(e.target.value)}
            />
            {q && <button onClick={() => setQ('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{[...Array(8)].map((_,i)=><div key={i} className="bg-white rounded-2xl h-64 animate-pulse"/>)}</div>}
        {!loading && q && results.length === 0 && (
          <div className="text-center py-20">
            <Search size={44} className="mx-auto text-gray-200 mb-4"/>
            <p className="text-gray-600 font-medium">Aucun résultat pour « {q} »</p>
            <Link to="/catalogue/menus_ingredients" className="inline-flex items-center gap-2 mt-5 bg-[#0D2137] text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
              Voir le catalogue <ArrowRight size={14}/>
            </Link>
          </div>
        )}
        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-5">{results.length} résultat{results.length>1?'s':''} pour « {q} »</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((p, i) => {
                const m = SECTION_META[p.section?.code] || SECTION_META.menus_ingredients
                return <ProduitCard key={p.id} produit={p} fallback={m.fallbacks[i % m.fallbacks.length]}/>
              })}
            </div>
          </>
        )}
        {!q && (
          <div className="text-center py-20 text-gray-400">
            <Search size={44} className="mx-auto mb-4 opacity-20"/>
            <p className="font-medium">Tapez pour rechercher dans tout le catalogue</p>
            <p className="text-sm mt-1">Menus camerounais, fruits, boissons, boulangerie, épices…</p>
          </div>
        )}
      </div>
    </div>
  )
}
