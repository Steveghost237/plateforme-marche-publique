import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, ChevronRight, Star, Truck, Shield, Clock, MapPin, Phone, CheckCircle } from 'lucide-react'
import api from '../utils/api'
import SafeImg from '../components/common/SafeImg'

// ── Images Unsplash libres ────────────────────────────────────
const HERO_SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=1600&q=85&fit=crop',
    tag: 'Menus Traditionnels',
    title: 'Les saveurs du\nCameroun livrées\nchez vous',
    sub: 'Ndolé, ERU, Poulet DG, Mbongo Tchobi — composés à votre goût, achetés au marché local.',
    href: '/catalogue/menus_ingredients',
  },
  {
    img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=85&fit=crop',
    tag: 'Fruits & Légumes Frais',
    title: 'Directement\ndu marché\nà votre table',
    sub: "Ananas, mangues, plantains, tomates — la fraîcheur du marché local livrée en 30 minutes.",
    href: '/catalogue/fruits',
  },
  {
    img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=85&fit=crop',
    tag: 'Boulangerie du Matin',
    title: 'Pain chaud,\nviennoiseries\net pâtisseries',
    sub: 'Chaque matin, nos livreurs récupèrent les produits les plus frais de nos boulangers partenaires.',
    href: '/catalogue/boulangerie',
  },
  {
    img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1600&q=85&fit=crop',
    tag: 'Épices & Condiments',
    title: 'Les épices qui\ndonnent du goût\nà vos plats',
    sub: 'Poivre de Penja, njansang, mbongo — tous les condiments du terroir camerounais.',
    href: '/catalogue/epices',
  },
  {
    img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=85&fit=crop',
    tag: 'Livraison Express',
    title: 'Commandé,\nlivré en\nmoins d\'une heure',
    sub: 'Nos livreurs engagés couvrent Yaoundé et Douala, 7j/7, du matin au soir.',
    href: '/inscription',
  },
]

const SECTIONS_DATA = [
  { code:'menus_ingredients', label:'Menus & Ingrédients', desc:'Plats traditionnels personnalisables', img:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80&fit=crop' },
  { code:'fruits',            label:'Fruits & Légumes',    desc:'Produits frais cueillis chaque matin',   img:'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80&fit=crop' },
  { code:'boissons',          label:'Boissons',            desc:'Jus naturels, eaux et boissons locales', img:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80&fit=crop' },
  { code:'boulangerie',       label:'Boulangerie',         desc:'Pains frais et viennoiseries artisanales',img:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&fit=crop' },
  { code:'epices',            label:'Épices & Condiments', desc:'Toutes les épices du terroir camerounais',img:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80&fit=crop' },
]

const FALLBACK_PRODUCTS = [
  { nom:'Menu ERU complet',    prix:4000, img:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80&fit=crop', slug:'menu-eru',     badge:'Bestseller' },
  { nom:'Ndolé aux crevettes', prix:3500, img:'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80&fit=crop', slug:'menu-ndole',   badge:'Populaire' },
  { nom:'Poulet DG',           prix:4500, img:'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop', slug:'menu-poulet-dg', badge:null },
  { nom:'Koki traditionnel',   prix:2500, img:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&fit=crop', slug:'menu-koki',    badge:'Nouveau' },
  { nom:'Mbongo Tchobi',       prix:5000, img:'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&fit=crop', slug:'menu-mbongo',  badge:null },
  { nom:'Okok aux arachides',  prix:3000, img:'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80&fit=crop', slug:'menu-okok',    badge:null },
]

const TESTIMONIALS = [
  { name:'Marie-Claire Fouda', role:'Cliente depuis 8 mois', city:'Yaoundé, Bastos',      note:5, avatar:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80&fit=crop&facepad=2', text:'Je commande chaque semaine mon ERU. Les ingrédients arrivent toujours frais, exactement comme je les aurais choisis moi-même au marché. Le service est impeccable.' },
  { name:'Patrick Ngoumou',    role:'Client depuis 5 mois',  city:'Yaoundé, Centre-ville', note:5, avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&fit=crop&facepad=2', text:'En tant que professionnel chargé, cette plateforme m\'a changé la vie. Je commande le matin, je reçois avant midi. La qualité des produits est vraiment au rendez-vous.' },
  { name:'Sylvie Mboumba',     role:'Cliente VIP',           city:'Douala, Akwa',          note:5, avatar:'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&q=80&fit=crop&facepad=2', text:'Le programme de fidélité est excellent. En quelques mois j\'ai atteint le niveau Or et je bénéficie de réductions à chaque commande. Je recommande à tous.' },
]

// ── Hook: Intersection Observer ───────────────────────────────
function useInView(threshold = 0.15) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// SafeImg importé depuis components/common/SafeImg

// ── Stars ─────────────────────────────────────────────────────
function Stars({ n = 5 }) {
  return <div className="flex gap-0.5">{[...Array(5)].map((_,i) => <Star key={i} size={12} fill={i<n?'#F59E0B':'none'} stroke={i<n?'#F59E0B':'#d1d5db'}/>)}</div>
}

// ══════════════════════════════════════════════════════════════
export default function Accueil() {
  const [slide, setSlide]       = useState(0)
  const [sliding, setSliding]   = useState(false)
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const timerRef = useRef(null)

  // Refs for scroll animations
  const [secRef, secVis]   = useInView()
  const [hiwRef, hiwVis]   = useInView()
  const [bestRef, bestVis] = useInView()
  const [conRef, conVis]   = useInView()
  const [fidRef, fidVis]   = useInView()
  const [tesRef, tesVis]   = useInView()
  const [ctaRef, ctaVis]   = useInView()

  useEffect(() => {
    api.get('/catalogue/produits?populaire=true&limit=6').then(r => { if (r.data?.length) setProducts(r.data) }).catch(() => {})
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setSliding(true)
      setTimeout(() => { setSlide(s => (s+1) % HERO_SLIDES.length); setSliding(false) }, 300)
    }, 6500)
  }, [])

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current) }, [startTimer])

  const goTo = (i) => {
    clearInterval(timerRef.current)
    setSliding(true)
    setTimeout(() => { setSlide(i); setSliding(false); startTimer() }, 280)
  }

  const cur = HERO_SLIDES[slide]

  return (
    <div className="overflow-x-hidden bg-[#F5EFE6]">

      {/* ═══ HERO SLIDER ════════════════════════════════════ */}
      <section className="relative" style={{ height: 'min(92vh, 900px)', minHeight: '600px' }}>

        {/* Toutes les slides */}
        {HERO_SLIDES.map((s, i) => (
          <div key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === slide ? 1 : 0, pointerEvents: i === slide ? 'auto' : 'none' }}>
            <SafeImg src={s.img} alt={s.tag} className="w-full h-full object-cover" />
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        ))}

        {/* Contenu slide */}
        <div className="relative h-full flex flex-col justify-center">
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-10">
            <div className={`max-w-2xl transition-all duration-500 ${sliding ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-8 bg-amber-400" />
                <span className="text-amber-400 text-xs font-bold tracking-[.3em] uppercase">{cur.tag}</span>
              </div>

              <h1 className="font-serif text-white leading-[1.05] mb-5 whitespace-pre-line"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 4.5rem)', fontWeight: 700 }}>
                {cur.title}
              </h1>

              <p className="text-white/70 leading-relaxed mb-8 max-w-xl"
                style={{ fontSize: 'clamp(.95rem, 1.8vw, 1.1rem)' }}>
                {cur.sub}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to={cur.href}
                  className="group inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-7 py-3.5 rounded-lg transition-all text-sm shadow-lg shadow-amber-500/30">
                  Commander maintenant
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link to="/inscription"
                  className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 text-white hover:bg-white/10 font-semibold px-7 py-3.5 rounded-lg transition-all text-sm backdrop-blur-sm">
                  Créer un compte
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-8 mt-10 pt-8 border-t border-white/15">
                {[['500+','Produits frais'],['30 min','Livraison moy.'],['4.9/5','Satisfaction']].map(([v,l]) => (
                  <div key={l}>
                    <div className="text-amber-400 font-serif font-bold text-2xl">{v}</div>
                    <div className="text-white/40 text-xs mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Flèches */}
        {[
          { fn: () => goTo((slide-1+HERO_SLIDES.length)%HERO_SLIDES.length), pos:'left-4', Icon:ArrowLeft },
          { fn: () => goTo((slide+1)%HERO_SLIDES.length),                    pos:'right-4', Icon:ArrowRight },
        ].map(({ fn, pos, Icon }) => (
          <button key={pos} onClick={fn}
            className={`absolute ${pos} top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all`}>
            <Icon size={17} />
          </button>
        ))}

        {/* Dots */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i===slide ? 'w-8 h-2 bg-amber-400' : 'w-2 h-2 bg-white/35 hover:bg-white/60'}`} />
          ))}
        </div>

        {/* Compteur */}
        <div className="absolute bottom-7 right-8 z-10 text-white/30 text-xs font-mono tracking-widest">
          {String(slide+1).padStart(2,'0')} / {String(HERO_SLIDES.length).padStart(2,'0')}
        </div>
      </section>

      {/* ═══ BANDEAU CONFIANCE ══════════════════════════════ */}
      <section className="bg-[#0D2137] py-3.5 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-5 sm:gap-10">
            {[
              [<Truck size={13}/>,   'Livraison en 30–60 min'],
              [<Shield size={13}/>,  'Produits vérifiés à la source'],
              [<MapPin size={13}/>,  'Yaoundé & Douala'],
              [<Clock size={13}/>,   'Ouvert 7j/7 · 7h–20h'],
              [<Star size={13}/>,    'Note 4.9/5 · 2 000+ clients'],
            ].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2 text-white/45 text-xs font-medium whitespace-nowrap">
                <span className="text-amber-400">{icon}</span>{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NOS 5 SECTIONS ═════════════════════════════════ */}
      <section ref={secRef} className="py-20 bg-[#F5EFE6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-12 transition-all duration-700 ${secVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-amber-600 text-xs font-bold tracking-[.3em] uppercase block mb-2">Catalogue complet</span>
            <h2 className="font-serif text-[#0D2137] font-bold mb-3" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>Nos 5 Sections</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">Du plat traditionnel aux épices locales, nous couvrons tout ce dont vous avez besoin.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {SECTIONS_DATA.map((s, i) => (
              <Link key={s.code} to={`/catalogue/${s.code}`}
                className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5
                  ${secVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i*80}ms` }}>
                <div className="relative h-44 overflow-hidden">
                  <SafeImg src={s.img} alt={s.label} className="w-full h-full object-cover group-hover:scale-107 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-tight">{s.label}</p>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{s.desc}</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Découvrir <ChevronRight size={12}/>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMMENT ÇA MARCHE ══════════════════════════════ */}
      <section ref={hiwRef} className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-700 ${hiwVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-amber-600 text-xs font-bold tracking-[.3em] uppercase block mb-2">Simple & Rapide</span>
            <h2 className="font-serif text-[#0D2137] font-bold mb-3" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>Comment ça marche ?</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { n:'01', title:'Composez votre commande', desc:'Parcourez nos 5 sections et personnalisez vos menus ingrédient par ingrédient, selon vos préférences.', img:'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500&q=80&fit=crop' },
              { n:'02', title:'Payez en toute sécurité',  desc:'MTN Mobile Money, Orange Money, ou espèces à la livraison. Paiement 100% sécurisé et confirmé par SMS.',  img:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&q=80&fit=crop' },
              { n:'03', title:'Votre livreur s\'en occupe',desc:'Il se rend au marché local, sélectionne vos produits avec soin et vous les livre en 30 à 60 minutes.', img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80&fit=crop' },
            ].map((step, i) => (
              <div key={step.n}
                className={`group transition-all duration-700 ${hiwVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i*150}ms` }}>
                <div className="relative rounded-2xl overflow-hidden h-56 mb-6 shadow-md group-hover:shadow-lg transition-shadow">
                  <SafeImg src={step.img} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D2137]/80 to-transparent" />
                  <div className="absolute bottom-4 left-5">
                    <span className="font-serif text-amber-400 font-bold" style={{fontSize:'2.5rem'}}>{step.n}</span>
                  </div>
                </div>
                <h3 className="font-bold text-[#0D2137] text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEST-SELLERS ═══════════════════════════════════ */}
      <section ref={bestRef} className="py-24 bg-[#0D2137]">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex justify-between items-end mb-12 transition-all duration-700 ${bestVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <span className="text-amber-400 text-xs font-bold tracking-[.3em] uppercase block mb-2">Les plus commandés</span>
              <h2 className="font-serif text-white font-bold" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>Nos Best-Sellers</h2>
            </div>
            <Link to="/catalogue/menus_ingredients" className="hidden sm:flex items-center gap-1 text-white/40 hover:text-white text-sm transition-colors">
              Tout voir <ArrowRight size={14}/>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {products.map((p, i) => {
              const fb = FALLBACK_PRODUCTS[i % FALLBACK_PRODUCTS.length]
              const img   = p.image_url || fb.img
              const nom   = p.nom
              const prix  = p.prix_base_fcfa || fb.prix
              const badge = p.est_populaire ? 'Populaire' : p.est_nouveau ? 'Nouveau' : fb.badge
              const slug  = p.slug || fb.slug
              return (
                <Link key={p.id || i} to={`/produit/${slug}`}
                  className={`group relative overflow-hidden rounded-2xl border border-white/5 hover:border-amber-500/40 transition-all duration-400 hover:-translate-y-1
                    ${bestVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${i*70}ms` }}>
                  <div className="relative h-44 overflow-hidden bg-gray-800">
                    <SafeImg src={img} alt={nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {badge && (
                      <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full
                        ${badge==='Bestseller'?'bg-amber-500 text-gray-900':badge==='Nouveau'?'bg-emerald-500 text-white':'bg-white/20 backdrop-blur-sm text-white border border-white/20'}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/5 px-4 py-4">
                    <h3 className="text-white font-semibold text-sm mb-1.5 line-clamp-1">{nom}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-lg">{(prix||0).toLocaleString()} F</span>
                      <span className="text-xs text-white/30 group-hover:text-amber-400 transition-colors flex items-center gap-0.5">
                        Voir <ChevronRight size={11}/>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ CONCEPT — Photo + Texte ════════════════════════ */}
      <section ref={conRef} className="py-24 bg-[#F5EFE6]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

          {/* Collage photos */}
          <div className={`relative transition-all duration-800 ${conVis ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <div className="grid grid-cols-2 gap-3">
              <SafeImg
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=85&fit=crop"
                alt="Marché local Cameroun"
                className="rounded-2xl w-full h-64 object-cover shadow-lg"
              />
              <div className="flex flex-col gap-3">
                <SafeImg
                  src="https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=85&fit=crop"
                  alt="Plat camerounais"
                  className="rounded-2xl w-full flex-1 object-cover shadow-md"
                  style={{height:'120px'}}
                />
                <SafeImg
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=85&fit=crop"
                  alt="Livraison à domicile"
                  className="rounded-2xl w-full flex-1 object-cover shadow-md"
                  style={{height:'120px'}}
                />
              </div>
            </div>
            {/* Badge flottant */}
            <div className="absolute -bottom-5 -right-4 bg-white rounded-2xl shadow-xl px-5 py-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-[#0D2137] text-sm">Qualité garantie</div>
                  <div className="text-gray-400 text-xs">Produits vérifiés à chaque commande</div>
                </div>
              </div>
            </div>
          </div>

          {/* Texte */}
          <div className={`transition-all duration-800 ${conVis ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`} style={{transitionDelay:'200ms'}}>
            <span className="text-amber-600 text-xs font-bold tracking-[.3em] uppercase block mb-3">Notre Mission</span>
            <h2 className="font-serif text-[#0D2137] font-bold leading-tight mb-5" style={{fontSize:'clamp(1.8rem,3.5vw,2.8rem)'}}>
              Le marché local,<br/>à votre porte
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm sm:text-base">
              Nous croyons que chaque famille camerounaise mérite un accès facile aux produits frais
              du marché local, sans perdre du temps dans les embouteillages ou les files d'attente.
            </p>
            <p className="text-gray-600 leading-relaxed mb-7 text-sm sm:text-base">
              Nos livreurs partenaires, formés et engagés, se rendent personnellement au marché
              pour sélectionner vos produits avec le même soin que vous le feriez vous-même.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {[['500+','Produits disponibles'],['12','Livreurs certifiés'],['2 500+','Clients satisfaits'],['4.9/5','Note moyenne']].map(([v,l]) => (
                <div key={l} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="font-serif font-bold text-[#0D2137] text-2xl">{v}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            <Link to="/catalogue/menus_ingredients"
              className="inline-flex items-center gap-2 bg-[#0D2137] hover:bg-[#1B3A5C] text-white font-bold px-7 py-3.5 rounded-lg transition-colors text-sm">
              Explorer le catalogue <ArrowRight size={15}/>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FIDÉLITÉ ════════════════════════════════════════ */}
      <section ref={fidRef} className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-14 transition-all duration-700 ${fidVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-amber-600 text-xs font-bold tracking-[.3em] uppercase block mb-2">Récompenses exclusives</span>
            <h2 className="font-serif text-[#0D2137] font-bold mb-3" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>Programme de Fidélité</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">1 point par tranche de 500 FCFA — échangez contre des réductions et livraisons gratuites.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { niveau:'Bronze', pts:'0 – 999 pts',       avantage:'Livraison −10%',  detail:'Sur les frais de livraison',           grad:'from-amber-700 to-amber-600', ring:'ring-amber-200', tc:'text-amber-800' },
              { niveau:'Argent', pts:'1 000 – 4 999 pts', avantage:'Réduction −10%',  detail:'Sur le montant total de la commande',   grad:'from-gray-500 to-gray-400',   ring:'ring-gray-200',  tc:'text-gray-600' },
              { niveau:'Or',     pts:'5 000 – 9 999 pts', avantage:'Réduction −15%',  detail:'Sur le total + un produit offert',      grad:'from-amber-500 to-amber-400', ring:'ring-amber-100', tc:'text-amber-600' },
              { niveau:'VIP',    pts:'10 000+ pts',        avantage:'Réduction −25%',  detail:'Tous avantages + livraison express offerte', grad:'from-purple-700 to-purple-600', ring:'ring-purple-200', tc:'text-purple-700' },
            ].map((n, i) => (
              <div key={n.niveau}
                className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1
                  ${fidVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{transitionDelay:`${i*100}ms`}}>
                <div className={`bg-gradient-to-br ${n.grad} px-5 py-6 text-white`}>
                  <div className={`w-11 h-11 rounded-full bg-white/20 ring-2 ${n.ring} flex items-center justify-center mb-3`}>
                    <Star size={18} fill="white" stroke="none" />
                  </div>
                  <div className="font-serif font-bold text-2xl">{n.niveau}</div>
                  <div className="text-white/65 text-xs mt-1">{n.pts}</div>
                </div>
                <div className="bg-white px-5 py-4">
                  <div className={`font-bold text-sm mb-1 ${n.tc}`}>{n.avantage}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{n.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={`text-center mt-10 transition-all duration-700 ${fidVis?'opacity-100':'opacity-0'}`} style={{transitionDelay:'400ms'}}>
            <Link to="/fidelite" className="inline-flex items-center gap-2 bg-[#0D2137] hover:bg-[#1B3A5C] text-white px-7 py-3.5 rounded-lg font-bold text-sm transition-colors">
              Voir mon programme <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TÉMOIGNAGES ════════════════════════════════════ */}
      <section ref={tesRef} className="py-24 bg-[#F5EFE6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-14 transition-all duration-700 ${tesVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-amber-600 text-xs font-bold tracking-[.3em] uppercase block mb-2">Ce qu'ils disent</span>
            <h2 className="font-serif text-[#0D2137] font-bold mb-2" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>Nos clients témoignent</h2>
            <p className="text-gray-500 text-sm">Plus de 2 500 familles nous font confiance à Yaoundé et Douala</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name}
                className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-500
                  ${tesVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{transitionDelay:`${i*150}ms`}}>
                <Stars n={t.note} />
                <p className="text-gray-600 text-sm leading-relaxed mt-4 mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-amber-100">
                    <SafeImg src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0D2137] text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.role} · {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ══════════════════════════════════════ */}
      <section ref={ctaRef} className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <SafeImg
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=75&fit=crop"
            alt="Marché Cameroun"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0D2137]/88" />
        </div>
        <div className={`relative max-w-2xl mx-auto px-6 text-center transition-all duration-800 ${ctaVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="text-amber-400 text-xs font-bold tracking-[.3em] uppercase block mb-4">Disponible bientôt</span>
          <h2 className="font-serif text-white font-bold mb-4" style={{fontSize:'clamp(2rem,4vw,3rem)'}}>
            L'application mobile<br/>Marché·CM
          </h2>
          <p className="text-white/55 leading-relaxed mb-8 max-w-lg mx-auto text-sm sm:text-base">
            Suivez vos livraisons en temps réel, recevez des notifications à chaque étape
            et gérez votre programme de fidélité depuis votre smartphone.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { store:'App Store',    icon:<svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
              { store:'Google Play',  icon:<svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0"><path d="M3.18 23.76c.31.17.67.19 1.01.04l12.44-7.17-2.79-2.79-10.66 9.92zM.25 2.27C.09 2.6 0 2.98 0 3.41v17.17c0 .43.09.82.25 1.14l.07.06 9.62-9.62v-.23L.32 2.21l-.07.06zM20.94 10.3L18.1 8.62l-3.08 3.08 3.08 3.08 2.87-1.67c.82-.48.82-1.25-.03-1.81zM4.19.2L16.63 7.37l-2.79 2.79L3.18.24c.34-.15.72-.13 1.01-.04z"/></svg> },
            ].map(({ store, icon }) => (
              <button key={store} className="flex items-center gap-2.5 bg-white text-[#0D2137] px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-amber-50 transition-colors shadow-lg">
                {icon} {store}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="tel:+237600000000" className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-xs">
              <Phone size={13}/> +237 6XX XXX XXX
            </a>
            <span className="text-white/20 text-xs">|</span>
            <a href="mailto:contact@marche.cm" className="text-white/40 hover:text-white transition-colors text-xs">contact@marche.cm</a>
          </div>
        </div>
      </section>
    </div>
  )
}
