import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, ArrowRight, Plus, Minus, ShoppingCart, ChevronRight, Star, X, Lightbulb, Send, ThumbsUp, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getImageUrl, apiErr } from '../utils/api'
import { usePanier, useAuth } from '../store'
import IngredientEditor from '../components/common/IngredientEditor'
import SafeImg from '../components/common/SafeImg'
import Breadcrumb from '../components/common/Breadcrumb'
import SEO from '../components/common/SEO'

const SECTION_META = {
  menus_ingredients: { label:'Composez vos Menus', emoji:'🥘', img:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=1200&q=80&fit=crop', color:'#0D2137',  fallbacks:['https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80&fit=crop'] },
  fruits:            { label:'Fruits & Légumes',    emoji:'🍊', img:'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80&fit=crop', color:'#166534',  fallbacks:['https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1563746924237-f81d91fec822?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&q=80&fit=crop'] },
  boissons:          { label:'Boissons',            emoji:'🥤', img:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200&q=80&fit=crop', color:'#1B4A8A',  fallbacks:['https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80&fit=crop'] },
  boulangerie:       { label:'Boulangerie',         emoji:'🍞', img:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80&fit=crop', color:'#7a3e10',  fallbacks:['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80&fit=crop'] },
  epices:            { label:'Épices & Condiments', emoji:'🌶️', img:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80&fit=crop', color:'#8a1a1a',  fallbacks:['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&q=80&fit=crop'] },
  epicerie:          { label:'Épicerie',            emoji:'🛒', img:'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&fit=crop', color:'#7a3e10',  fallbacks:['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&q=80&fit=crop'] },
  entretien:         { label:'Entretien & Maison',  emoji:'🧹', img:'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=1200&q=80&fit=crop', color:'#0e7490',  fallbacks:['https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=400&q=80&fit=crop'] },
  cosmetique:        { label:'Cosmétique & Hygiène',emoji:'🧴', img:'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80&fit=crop', color:'#a21caf',  fallbacks:['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80&fit=crop','https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80&fit=crop'] },
  ma_liste:          { label:'Ma Liste de Marché',  emoji:'📝', img:'https://images.unsplash.com/photo-1543168256-418811576931?w=1200&q=80&fit=crop', color:'#0D2137',  fallbacks:[] },
}

// SafeImg importé depuis components/common/SafeImg

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
        <p className="text-xs text-amber-600">À partir de 1000 F</p>
        <p className="text-xs text-amber-600 mt-0.5">Yaoundé · Douala</p>
      </div>
    </aside>
  )
}

// ── MODAL SUGGESTION PRODUIT ──────────────────────────────────
function SuggestionModal({ isOpen, onClose, sectionCode }) {
  const { isAuth } = useAuth()
  const [form, setForm] = useState({ nom:'', description:'', prix_suggere_fcfa:'', section_code: sectionCode, est_menu:false, ingredients:[] })
  const [imageFile, setImageFile] = useState(null)
  const [imagePrev, setImagePrev] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [votes, setVotes]     = useState(null)
  const imgRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setForm(f => ({...f, section_code: sectionCode, est_menu: sectionCode === 'menus_ingredients'}))
      setDone(false); setVotes(null); setImageFile(null); setImagePrev(null)
    }
  }, [isOpen, sectionCode])

  const choisirImage = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return }
    setImageFile(f); setImagePrev(URL.createObjectURL(f))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nom.trim() || form.nom.trim().length < 2) { toast.error('Nom requis (min 2 caractères)'); return }
    if (!isAuth) { toast.error('Connectez-vous pour suggérer un produit'); return }
    if (form.est_menu && form.ingredients.length === 0) { toast.error('Ajoutez au moins un ingrédient au menu'); return }
    setLoading(true)
    try {
      let image_url = null
      if (imageFile) {
        const fd = new FormData(); fd.append('file', imageFile)
        image_url = (await api.post('/uploads/image-suggestion', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data.image_url
      }
      // Menu : le prix est calculé (Σ prix défaut des ingrédients), pas saisi
      const prix_suggere_fcfa = form.est_menu
        ? (form.ingredients || []).reduce((a, i) => a + (parseInt(i.prix_defaut_fcfa) || 0), 0)
        : form.prix_suggere_fcfa
      const { data } = await api.post('/suggestions/', { ...form, prix_suggere_fcfa, image_url })
      if (data.is_doublon) {
        setVotes(data.votes)
        toast.success('Votre vote a été ajouté à cette suggestion !')
      } else {
        setDone(true)
        toast.success('Suggestion envoyée ! +100 pts si approuvée')
      }
    } catch (err) {
      toast.error(apiErr(err, 'Erreur lors de l\'envoi'))
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
              {!form.est_menu && (
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Prix estimé (FCFA)</label>
                  <input
                    type="number" min="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="Ex: 1500"
                    value={form.prix_suggere_fcfa} onChange={e => setForm(f=>({...f, prix_suggere_fcfa: e.target.value ? parseInt(e.target.value) : ''}))}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Photo du produit</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => imgRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#0D2137] flex items-center justify-center overflow-hidden bg-gray-50 transition-colors shrink-0">
                    {imagePrev ? <img src={imagePrev} alt="" className="w-full h-full object-cover"/> : <Camera size={18} className="text-gray-300"/>}
                  </button>
                  <div className="text-xs text-gray-400">
                    <p className="font-medium text-gray-500">{imagePrev ? 'Photo sélectionnée ✓' : 'Ajoutez une photo (optionnel)'}</p>
                    <p>JPG, PNG ou WebP — max 5 Mo</p>
                  </div>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={choisirImage}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Section</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] bg-white"
                  value={form.section_code} onChange={e => setForm(f=>({...f, section_code:e.target.value, est_menu: e.target.value === 'menus_ingredients' ? true : f.est_menu}))}
                >
                  <option value="menus_ingredients">🥘 Menus & Ingrédients</option>
                  <option value="fruits">🍊 Fruits & Légumes</option>
                  <option value="boissons">🥤 Boissons</option>
                  <option value="boulangerie">🍞 Boulangerie</option>
                  <option value="epices">🌶️ Épices & Condiments</option>
                  <option value="epicerie">🛒 Épicerie & Alimentaire</option>
                  <option value="entretien">🧹 Entretien & Maison</option>
                  <option value="cosmetique">🧴 Cosmétique & Hygiène</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-purple-600"
                  checked={form.est_menu}
                  onChange={e => setForm(f=>({...f, est_menu:e.target.checked}))}/>
                <div>
                  <p className="text-xs font-bold text-purple-700">🥘 C'est un menu personnalisable</p>
                  <p className="text-[10px] text-purple-400">Le client composera son plat en choisissant les ingrédients</p>
                </div>
              </label>

              {form.est_menu && (
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Ingrédients du menu *</label>
                  <IngredientEditor value={form.ingredients} onChange={v => setForm(f=>({...f, ingredients:v}))}/>
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-purple-500">Prix du menu (calculé automatiquement)</span>
                    <span className="text-sm font-bold text-purple-700">
                      {(form.ingredients || []).reduce((a, i) => a + (parseInt(i.prix_defaut_fcfa) || 0), 0).toLocaleString()} F
                    </span>
                  </div>
                </div>
              )}

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

// ── MA LISTE DE MARCHÉ (articles personnalisés) ───────────────
function MaListeBuilder() {
  const { addCustom } = usePanier()
  const navigate = useNavigate()
  const [produit, setProduit] = useState(null)
  const [checking, setChecking] = useState(true)
  const [items, setItems]   = useState([])
  const [form, setForm]     = useState({ nom: '', quantite: 1 })

  useEffect(() => {
    api.get('/catalogue/produits?section=ma_liste&limit=10')
      .then(r => setProduit(r.data.find(p => p.slug === 'article-personnalise') || r.data[0] || null))
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const addItem = (e) => {
    e?.preventDefault()
    const nom = form.nom.trim()
    if (nom.length < 2) { toast.error('Décrivez l\'article (ex: Sardine 125g, Riz parfumé 5kg…)'); return }
    setItems(it => [...it, { nom, quantite: Math.max(1, parseInt(form.quantite) || 1), prix: 0 }])
    setForm({ nom: '', quantite: 1 })
  }

  const totalEstime = 0

  const addAllToCart = () => {
    if (!produit) { toast.error('Fonctionnalité en cours d\'activation — réessayez bientôt'); return }
    items.forEach(i => addCustom(produit, { nom: i.nom, quantite: i.quantite, prixUnit: i.prix }))
    toast.success(`${items.length} article${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''} au panier`, { icon: '📝' })
    navigate('/panier')
  }

  return (
    <div className="space-y-5">
      {/* Bandeau explicatif */}
      <div className="bg-gradient-to-r from-[#0D2137] to-[#1B4A7A] rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h3 className="font-bold text-base mb-1.5">📝 Votre liste, vos produits</h3>
          <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
            Un produit n'est pas au catalogue ? Écrivez-le ici : notre livreur le trouvera au marché.
            <strong className="text-amber-400">Pas besoin de prix</strong> — notre agent confirme le vrai prix au marché avant votre paiement.
          </p>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={addItem} className="bg-white rounded-2xl shadow-sm p-5">
        <div className="grid sm:grid-cols-[1fr_110px_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Article *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] focus:ring-2 focus:ring-[#0D2137]/10"
              placeholder="Ex: Sardine 125g, Riz parfumé 5 kg, Savon…"
              value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Quantité</label>
            <input type="number" min="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
              value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
            />
          </div>
          <button type="submit"
            className="bg-[#0D2137] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all flex items-center justify-center gap-2 min-h-[42px]">
            <Plus size={15}/> Ajouter
          </button>
        </div>
      </form>

      {/* Liste en cours */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold text-[#0D2137] uppercase tracking-wide">Ma liste ({items.length} article{items.length > 1 ? 's' : ''})</span>
          {items.length > 0 && (
            <span className="text-xs text-amber-600 font-semibold">💰 Prix confirmés par l'agent au marché</span>
          )}
        </div>
        {items.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <span className="text-4xl block mb-3">📝</span>
            <p className="text-sm font-medium">Votre liste est vide</p>
            <p className="text-xs mt-1">Ajoutez vos articles un par un avec le formulaire ci-dessus</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((it, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-[#0D2137] truncate">{it.nom}</span>
                <span className="text-xs text-gray-400 shrink-0">×{it.quantite}</span>
                <span className="text-sm font-bold text-amber-500 w-20 text-right shrink-0">
                  {it.prix > 0 ? `${(it.prix * it.quantite).toLocaleString()} F` : 'au marché'}
                </span>
                <button onClick={() => setItems(arr => arr.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0">
                  <X size={14}/>
                </button>
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={addAllToCart} disabled={checking || !produit}
              className="w-full bg-[#0D2137] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
              <ShoppingCart size={16}/> Ajouter {items.length} article{items.length > 1 ? 's' : ''} au panier
            </button>
            {!produit && !checking && (
              <p className="text-center text-xs text-red-500 mt-2">Fonctionnalité en cours d'activation — le produit référence n'est pas encore disponible.</p>
            )}
          </div>
        )}
      </div>

      {/* Listes favorites sauvegardées depuis le panier */}
      <ListesFavorites/>
    </div>
  )
}

// ── LISTES FAVORITES (panier enregistré) ──────────────────────
function ListesFavorites() {
  const { isAuth } = useAuth()
  const { add, addCustom } = usePanier()
  const navigate   = useNavigate()
  const [listes, setListes] = useState(null)

  const charger = () => api.get('/favoris/').then(r => setListes(r.data || [])).catch(() => setListes([]))
  useEffect(() => { isAuth ? charger() : setListes(null) }, [isAuth])

  if (!listes || listes.length === 0) return null

  const ajouterTout = (liste) => {
    liste.produits.forEach(p => {
      const cfg   = p.configuration || {}
      const ings  = cfg.ingredients || []
      const prixU = cfg.prix_unitaire != null ? cfg.prix_unitaire : (p.prix_base_fcfa || 0)
      const note  = cfg.note || null
      const prod  = { id: p.produit_id, nom: p.nom, slug: p.slug, image_url: p.image_url, prix_base_fcfa: p.prix_base_fcfa, est_menu: p.est_menu }
      if (cfg.custom && note) {
        // article « au marché » : son vrai nom est dans la note, pas le produit
        addCustom(prod, { nom: note, quantite: p.quantite || 1, prixUnit: prixU })
      } else {
        // clé distincte par configuration pour ne pas fusionner 2 recettes du même menu
        add(prod, p.quantite || 1, prixU, ings, note, ings.length > 0 ? `fav_${p.ligne_id}` : null)
      }
    })
    toast.success(`Liste « ${liste.nom} » ajoutée au panier`)
    navigate('/panier')
  }
  const supprimer = async (liste) => {
    try { await api.delete(`/favoris/${liste.id}`); toast.success(`Liste « ${liste.nom} » supprimée`); charger() }
    catch { toast.error('Suppression impossible') }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
        <span className="text-xs font-bold text-[#0D2137] uppercase tracking-wide">❤️ Mes listes enregistrées</span>
      </div>
      <div className="divide-y divide-gray-50">
        {listes.map(l => {
          const totalL = l.produits.reduce((a, p) => a + (p.prix_base_fcfa || 0) * (p.quantite || 1), 0)
          return (
            <div key={l.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div>
                  <span className="font-bold text-[#0D2137] text-sm">{l.nom}</span>
                  <span className="text-xs text-gray-400 ml-2">{l.produits.length} produit{l.produits.length > 1 ? 's' : ''} · ≈ {totalL.toLocaleString()} F</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => ajouterTout(l)}
                    className="bg-[#0D2137] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-amber-400 hover:text-gray-900 transition-all">
                    <ShoppingCart size={13}/> Ajouter au panier
                  </button>
                  <button onClick={() => supprimer(l)} title="Supprimer la liste"
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <X size={14}/>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {l.produits.map(p => (
                  <span key={p.ligne_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-1 pr-2.5 py-1 text-xs text-gray-600">
                    <SafeImg src={getImageUrl(p.image_url)} alt="" className="w-5 h-5 rounded-full object-cover"/>
                    {p.configuration?.note || p.nom} <span className="text-gray-400">×{p.quantite}</span>
                    {p.configuration?.ingredients?.length > 0 && <span title="Recette personnalisée">🥘</span>}
                    {p.configuration?.custom && <span title="Prix confirmé par l'agent au marché">🛒</span>}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
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
  const [error, setError]         = useState(false)
  const [q, setQ]                 = useState('')
  const [filtre, setFiltre]       = useState('tous')
  const [prixMax, setPrixMax]     = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const meta = SECTION_META[section] || SECTION_META.menus_ingredients

  const loadProduits = async () => {
    setLoading(true); setError(false)
    try {
      let all = [], page = 1
      while (true) {
        const r = await api.get(`/catalogue/produits?section=${section}&page=${page}&limit=100`)
        all = all.concat(r.data)
        if (r.data.length < 100) break
        page += 1
      }
      setProduits(all)
    } catch {
      setProduits([]); setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setQ(''); setFiltre('tous'); setPrixMax('')
    loadProduits()
  }, [section])

  const filtered = produits.filter(p => {
    if (q && !p.nom.toLowerCase().includes(q.toLowerCase())) return false
    if (filtre === 'populaire'  && !p.est_populaire) return false
    if (filtre === 'nouveau'    && !p.est_nouveau)   return false
    if (filtre === 'disponible' && !p.stock_dispo)   return false
    if (prixMax && p.prix_base_fcfa > Number(prixMax)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <SEO title={`${meta.label} — Catalogue`} description={`Découvrez nos ${meta.label.toLowerCase()} frais du marché camerounais. Livraison à domicile Yaoundé & Douala.`}/>
      <Breadcrumb items={[{ label:'Catalogue', to:'/catalogue/menus_ingredients' }, { label: meta.label }]}/>
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
            <p className="text-white/60 text-xs mt-0.5">
              {section === 'ma_liste' ? 'Vos articles sur mesure · Prix confirmés au marché' : `${produits.length} produits · Marché en ligne Cameroun`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <SidebarNav current={section} />

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
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

          {section === 'ma_liste' ? (
            <MaListeBuilder/>
          ) : (<>
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
                  className={`text-xs font-semibold px-3 py-2.5 min-h-[44px] rounded-lg transition-colors ${filtre===v ? 'bg-[#0D2137] text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="relative w-32">
              <input type="number" inputMode="numeric" placeholder="Prix max"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#0D2137] min-h-[44px]"
                value={prixMax} onChange={e => setPrixMax(e.target.value)} min={0} step={500}/>
              {prixMax && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">FCFA</span>}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="bg-white rounded-2xl animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-t-2xl"/>
                  <div className="p-3.5 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3"/>
                    <div className="h-4 bg-gray-200 rounded w-2/3"/>
                    <div className="h-4 bg-gray-200 rounded w-1/2"/>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-24 bg-white rounded-2xl">
              <div className="text-5xl mb-4">📡</div>
              <p className="text-gray-600 font-semibold mb-2">Impossible de charger les produits</p>
              <p className="text-gray-400 text-sm mb-6">Vérifiez votre connexion internet et réessayez</p>
              <button onClick={loadProduits}
                className="bg-[#0D2137] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
                🔄 Réessayer
              </button>
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
              {/* Bannière composition dynamique */}
              {section === 'menus_ingredients' && (
                <div className="mb-5 bg-gradient-to-r from-[#0D2137] to-[#1B4A7A] rounded-2xl p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🍽️</span>
                      <h3 className="font-bold text-base">Ici, rien n'est tout fait !</h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                      Chaque menu est <strong className="text-amber-400">composé par vous</strong> : choisissez vos ingrédients,
                      ajustez les quantités avec les curseurs, et notre livreur achète tout frais au marché local.
                      Cliquez sur <span className="bg-blue-500/30 text-blue-200 font-bold px-1.5 py-0.5 rounded text-xs">Composer →</span> pour personnaliser.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
          </>)}
        </div>
      </div>

      {/* Modal suggestion */}
      <SuggestionModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} sectionCode={section}/>
    </div>
  )
}

function ProduitCard({ produit: p, fallback }) {
  const { add } = usePanier()
  const img = getImageUrl(p.image_url) || fallback

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
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
            <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">Rupture de stock</span>
            <button onClick={e => { e.preventDefault(); toast('Vous serez notifié dès le retour en stock !', { icon:'🔔' }) }}
              className="bg-amber-400 text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full hover:bg-amber-300 transition-colors min-h-[32px]">
              🔔 Me prévenir
            </button>
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
            {p.est_menu && p.prix_max_fcfa && p.prix_max_fcfa !== p.prix_base_fcfa && (
              <span className="text-gray-300 text-xs ml-1">– {p.prix_max_fcfa.toLocaleString()}</span>
            )}
          </div>
          {p.est_menu ? (
            <span className="flex items-center gap-0.5 text-[#1B6CA8] text-xs font-bold bg-blue-50 px-2 py-1 rounded-lg">
              Composer <ChevronRight size={10}/>
            </span>
          ) : (
            <button onClick={handleAdd} disabled={!p.stock_dispo}
              className="w-10 h-10 sm:w-8 sm:h-8 bg-[#0D2137] hover:bg-amber-400 hover:text-gray-900 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 shadow-sm">
              <Plus size={16}/>
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
    const qMin = Number(ing.quantite_min || 0)
    const qMax = Number(ing.quantite_max || 100)
    const pMin = Number(ing.prix_min_fcfa || 0)
    const pMax = Number(ing.prix_max_fcfa || 0)
    const qDef = Number(ing.quantite_defaut || 0)
    const pDef = Number(ing.prix_defaut_fcfa || 0)

    const interp = (qa, pa, qb, pb) => {
      if (qb === qa) return pb
      const r = Math.max(0, Math.min(1, (qte - qa) / (qb - qa)))
      return pa + r * (pb - pa)
    }

    // Courbe par morceaux : min→défaut→max — le prix au défaut est exactement prix_defaut_fcfa
    let prix
    if (pDef > 0 && qMin < qDef && qDef < qMax) {
      prix = qte <= qDef ? interp(qMin, pMin, qDef, pDef) : interp(qDef, pDef, qMax, pMax)
    } else {
      // Pas de prix défaut renseigné : interpolation linéaire min→max
      prix = interp(qMin, pMin, qMax, pMax)
    }
    return Math.min(Math.max(Math.round(prix), 50), 100000)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#0D2137]/20 border-t-[#0D2137] rounded-full animate-spin"/>
    </div>
  )
  if (!produit) return null

  const sCode    = produit.section?.code || 'menus_ingredients'
  const meta     = SECTION_META[sCode] || SECTION_META.menus_ingredients
  const img      = getImageUrl(produit.image_url) || meta.fallbacks[0]
  const prixBase = produit.prix_base_fcfa || 0
  const prixIngs = Object.values(config).reduce((a, c) => a + (c.prix || 0), 0)
  // Menu : le prix payé = somme des ingrédients choisis. Sans ingrédient tarifé
  // (menu pas encore configuré), on retombe sur le prix de base — jamais 0 F.
  const prixUnit = produit.est_menu && produit.ingredients?.length > 0 && prixIngs > 0 ? prixIngs : prixBase
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
      <SEO title={produit.nom} description={produit.description || `${produit.nom} — ${(prixBase).toLocaleString()} FCFA. Livraison à domicile Yaoundé & Douala.`}/>
      <Breadcrumb items={[
        { label:'Catalogue', to:`/catalogue/${sCode}` },
        { label: meta.label, to:`/catalogue/${sCode}` },
        { label: produit.nom },
      ]}/>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D2137] text-sm mb-6 transition-colors group min-h-[44px]">
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
                <span className="text-amber-500 font-bold text-2xl">{prixUnit.toLocaleString()} F</span>
                {produit.est_menu && prixUnit !== prixBase && (
                  <span className="text-gray-400 text-sm">défaut {prixBase.toLocaleString()} F</span>
                )}
                {produit.est_menu && produit.prix_max_fcfa && produit.prix_max_fcfa !== prixBase && (
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
                    const curPrix = config[ing.id]?.prix ?? calcPrixCurseur(ing, Number(ing.quantite_defaut))
                    const qMin = Number(ing.quantite_min || 0)
                    const qMax = Number(ing.quantite_max || 100)
                    const progressPercent = qMax > qMin ? ((curQte - qMin) / (qMax - qMin)) * 100 : 0

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
                            <div className="relative">
                              <input
                                type="range"
                                min={qMin}
                                max={qMax}
                                step={ing.unite === 'g' ? Math.min(50, Math.max(10, Math.round((qMax - qMin) / 10)))
                                     : ing.unite === 'kg' ? Math.min(0.5, Math.max(0.05, (qMax - qMin) / 4))
                                     : (ing.unite === 'cl' || ing.unite === 'ml') ? Math.min(5, Math.max(1, Math.round((qMax - qMin) / 10)))
                                     : 1}
                                value={curQte}
                                onChange={e => updateCurseur(ing, Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                  '--progress': `${progressPercent}%`,
                                  background: `linear-gradient(to right, #0D2137 0%, #0D2137 var(--progress), #e5e7eb var(--progress), #e5e7eb 100%)`,
                                  WebkitAppearance: 'none',
                                  outline: 'none'
                                }}
                              />
                              <style>{`
                                input[type="range"]::-webkit-slider-thumb {
                                  -webkit-appearance: none;
                                  appearance: none;
                                  width: 18px;
                                  height: 18px;
                                  border-radius: 50%;
                                  background: #0D2137;
                                  cursor: pointer;
                                  border: 3px solid white;
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                  transition: all 0.15s ease;
                                }
                                input[type="range"]::-webkit-slider-thumb:hover {
                                  transform: scale(1.15);
                                  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                                }
                                input[type="range"]::-moz-range-thumb {
                                  width: 18px;
                                  height: 18px;
                                  border-radius: 50%;
                                  background: #0D2137;
                                  cursor: pointer;
                                  border: 3px solid white;
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                  transition: all 0.15s ease;
                                }
                                input[type="range"]::-moz-range-thumb:hover {
                                  transform: scale(1.15);
                                  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                                }
                              `}</style>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                              <span className="text-gray-400">{qMin} {ing.unite !== 'unite' ? ing.unite : ''}</span>
                              <span className="font-bold text-[#0D2137] bg-amber-50 px-2 py-0.5 rounded">
                                {curQte} {ing.unite !== 'unite' ? ing.unite : ''}
                              </span>
                              <span className="text-gray-400">{qMax} {ing.unite !== 'unite' ? ing.unite : ''}</span>
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
                    <span>Σ ingrédients choisis : {prixIngs.toLocaleString()} F{prixIngs !== prixBase ? ` (défaut : ${prixBase.toLocaleString()} F)` : ''}</span>
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
            <p className="text-center text-xs text-gray-400">🔒 Paiement sécurisé · 🚚 Livraison dès 1000 F · Yaoundé & Douala</p>
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
  const [filtre, setFiltre]   = useState('tous')
  const [secFiltre, setSec]   = useState('tous')
  const [prixMax, setPrixMax] = useState('')

  useEffect(() => {
    if (!q.trim()) { setRes([]); return }
    const t = setTimeout(async () => {
      setLoad(true)
      try {
        let all = [], page = 1
        while (true) {
          const r = await api.get(`/catalogue/produits?q=${encodeURIComponent(q)}&page=${page}&limit=100`)
          all = all.concat(r.data)
          if (r.data.length < 100) break
          page += 1
        }
        setRes(all)
      } catch { /* silencieux */ }
      finally { setLoad(false) }
    }, 380)
    return () => clearTimeout(t)
  }, [q])

  const filtered = results.filter(p => {
    if (secFiltre !== 'tous' && p.section?.code !== secFiltre) return false
    if (filtre === 'populaire'  && !p.est_populaire) return false
    if (filtre === 'nouveau'    && !p.est_nouveau)   return false
    if (filtre === 'disponible' && !p.stock_dispo)   return false
    if (prixMax && p.prix_base_fcfa > Number(prixMax)) return false
    return true
  })
  // Sections présentes dans les résultats (pour le filtre)
  const secs = [...new Map(results.map(p => [p.section?.code, p.section?.nom]).filter(([c]) => c)).entries()]

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
            {/* Barre de filtres */}
            <div className="flex flex-wrap gap-3 mb-5 items-center">
              {secs.length > 1 && (
                <select value={secFiltre} onChange={e => setSec(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137] min-h-[44px]">
                  <option value="tous">Toutes les sections</option>
                  {secs.map(([code, nom]) => <option key={code} value={code}>{nom}</option>)}
                </select>
              )}
              <div className="flex gap-1.5 flex-wrap">
                {[['tous','Tous'],['populaire','⭐ Populaires'],['nouveau','✨ Nouveaux'],['disponible','✅ Dispo']].map(([v,l]) => (
                  <button key={v} onClick={() => setFiltre(v)}
                    className={`text-xs font-semibold px-3 py-2.5 min-h-[44px] rounded-lg transition-colors ${filtre===v ? 'bg-[#0D2137] text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="relative w-32">
                <input type="number" inputMode="numeric" placeholder="Prix max"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#0D2137] min-h-[44px]"
                  value={prixMax} onChange={e => setPrixMax(e.target.value)} min={0} step={500}/>
                {prixMax && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">FCFA</span>}
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              {filtered.length} résultat{filtered.length>1?'s':''} pour « {q} »
              {filtered.length !== results.length && ` (${results.length} au total)`}
            </p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((p, i) => {
                  const m = SECTION_META[p.section?.code] || SECTION_META.menus_ingredients
                  return <ProduitCard key={p.id} produit={p} fallback={m.fallbacks[i % m.fallbacks.length]}/>
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">Aucun résultat ne correspond aux filtres.</p>
                <button onClick={() => { setFiltre('tous'); setSec('tous'); setPrixMax('') }}
                  className="mt-3 text-sm font-semibold text-[#0D2137] underline">Réinitialiser les filtres</button>
              </div>
            )}
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
