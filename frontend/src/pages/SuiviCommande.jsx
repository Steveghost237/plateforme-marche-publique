import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Phone, MessageCircle, ArrowLeft, Check, Clock, Package, Truck, MapPin, Star, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const STATUTS_TIMELINE = [
  { key: 'payee',           label: 'Commande confirmée', emoji: '✅', desc: 'Votre commande a été validée' },
  { key: 'assignee',        label: 'Livreur assigné',    emoji: '🛵', desc: 'Un livreur se dirige vers le marché' },
  { key: 'en_cours_marche', label: 'Au marché',          emoji: '🛒', desc: 'Votre livreur achète vos produits' },
  { key: 'en_livraison',    label: 'En route',           emoji: '🚀', desc: 'Votre commande est en chemin' },
  { key: 'livree',          label: 'Livré !',            emoji: '🎉', desc: 'Commande livrée avec succès' },
]

const STATUT_ORDER = ['payee', 'assignee', 'en_cours_marche', 'en_livraison', 'livree']

function getStatutIndex(statut) {
  return STATUT_ORDER.indexOf(statut)
}

// Simulation GPS dots
function GPSMap({ statut, livreurNom = 'Livreur' }) {
  const [dots, setDots] = useState([
    { id: 1, x: 30, y: 60, type: 'marche', label: 'Marché Mokolo' },
    { id: 2, x: 70, y: 35, type: 'client', label: 'Votre adresse' },
    { id: 3, x: 45, y: 50, type: 'livreur', label: 'Livreur', moving: true },
  ])
  const [livreurPos, setLivreurPos] = useState({ x: 45, y: 50 })
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (statut !== 'en_livraison' && statut !== 'en_cours_marche') return
    const interval = setInterval(() => {
      setPulse(p => !p)
      setLivreurPos(pos => {
        const targetX = statut === 'en_livraison' ? 70 : 30
        const targetY = statut === 'en_livraison' ? 35 : 60
        const dx = (targetX - pos.x) * 0.05
        const dy = (targetY - pos.y) * 0.05
        return { x: pos.x + dx + (Math.random() - 0.5) * 0.5, y: pos.y + dy + (Math.random() - 0.5) * 0.5 }
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [statut])

  return (
    <div className="relative h-44 bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 rounded-2xl overflow-hidden">
      {/* Grille de carte */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
        {[10,20,30,40,50,60,70,80,90].map(v => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="#0D2137" strokeWidth="0.3"/>
            <line x1="0" y1={v} x2="100" y2={v} stroke="#0D2137" strokeWidth="0.3"/>
          </g>
        ))}
        {/* Routes simulées */}
        <path d="M 30 60 L 45 52 L 60 42 L 70 35" stroke="#1B6CA8" strokeWidth="1.5" fill="none" strokeDasharray="2,1"/>
        <path d="M 30 60 L 20 50 L 15 38" stroke="#1B6CA8" strokeWidth="1" fill="none"/>
        <path d="M 70 35 L 80 30 L 90 28" stroke="#1B6CA8" strokeWidth="1" fill="none"/>
      </svg>
      {/* Marché */}
      <div className="absolute text-center" style={{left:'27%', top:'55%', transform:'translate(-50%,-50%)'}}>
        <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-sm shadow-lg border-2 border-white">🏪</div>
        <p className="text-[8px] font-bold text-amber-700 mt-0.5 whitespace-nowrap">Marché Mokolo</p>
      </div>
      {/* Client */}
      <div className="absolute text-center" style={{left:'67%', top:'30%', transform:'translate(-50%,-50%)'}}>
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm shadow-lg border-2 border-white">🏠</div>
        <p className="text-[8px] font-bold text-green-700 mt-0.5 whitespace-nowrap">Chez vous</p>
      </div>
      {/* Livreur (animé) */}
      <div className="absolute text-center transition-all duration-1500 ease-linear"
        style={{left:`${livreurPos.x}%`, top:`${livreurPos.y}%`, transform:'translate(-50%,-100%)'}}>
        <div className={`w-9 h-9 bg-[#0D2137] rounded-full flex items-center justify-center shadow-xl border-2 border-amber-400 ${pulse ? 'scale-110' : 'scale-100'} transition-transform duration-500`}>
          <span className="text-base">🛵</span>
        </div>
        <div className="bg-[#0D2137] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shadow">
          {livreurNom}
        </div>
      </div>
      {/* Overlay statut */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
        <p className="text-[9px] font-bold text-[#0D2137]">
          {statut === 'en_livraison' ? '🟢 En route · ~15 min' :
           statut === 'en_cours_marche' ? '🟡 Au marché · ~25 min' :
           statut === 'assignee' ? '🔵 Vers le marché' : '⏳ En attente'}
        </p>
      </div>
      {/* Badge GPS live */}
      <div className="absolute bottom-2 left-2 bg-[#0D2137]/80 backdrop-blur-sm text-white text-[8px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
        GPS en direct
      </div>
    </div>
  )
}

export default function SuiviCommande() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [commande, setCommande] = useState(null)
  const [loading, setLoading]   = useState(true)
  const intervalRef = useRef(null)

  const fetchCommande = async () => {
    try {
      const { data } = await api.get(`/commandes/${id}`)
      setCommande(data)
      if (data.statut === 'livree' || data.statut === 'annulee') {
        clearInterval(intervalRef.current)
      }
    } catch {
      toast.error('Commande introuvable')
      navigate('/commandes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommande()
    intervalRef.current = setInterval(fetchCommande, 30000)
    return () => clearInterval(intervalRef.current)
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#0D2137]/20 border-t-[#0D2137] rounded-full animate-spin"/>
    </div>
  )
  if (!commande) return null

  const statutIdx = getStatutIndex(commande.statut)
  const isLivree  = commande.statut === 'livree'
  const isAnnulee = commande.statut === 'annulee'
  const currentStep = STATUTS_TIMELINE.find(s => s.key === commande.statut)
  const showGPS = ['assignee', 'en_cours_marche', 'en_livraison'].includes(commande.statut)

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <div className="bg-[#0D2137] px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/commandes')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={18}/>
            </button>
            <div className="flex-1">
              <h1 className="text-white font-bold text-sm">Suivi commande</h1>
              <p className="text-white/50 text-xs">{commande.numero}</p>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full
              ${isLivree ? 'bg-green-500 text-white' :
                isAnnulee ? 'bg-red-500 text-white' :
                'bg-amber-400 text-gray-900'}`}>
              {isLivree ? '✅ Livré' : isAnnulee ? '❌ Annulé' : '🔄 En cours'}
            </div>
          </div>

          {/* ETA bar */}
          {showGPS && (
            <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <Clock size={13} className="text-amber-400 shrink-0"/>
              <div className="flex-1">
                <p className="text-white text-xs font-bold">
                  {commande.statut === 'en_livraison' ? 'Livraison estimée dans ~15 min' :
                   commande.statut === 'en_cours_marche' ? 'Livreur au marché · ~25 min' :
                   'Livreur en route vers le marché'}
                </p>
                <p className="text-white/40 text-[10px]">Créneau : {commande.creneau?.replace(/_/g,' ')}</p>
              </div>
              <button onClick={fetchCommande} className="text-amber-400 text-[10px] font-bold hover:text-amber-300">
                ↻ Actualiser
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Carte GPS */}
        {showGPS && <GPSMap statut={commande.statut} livreurNom={commande.livreur_nom ? commande.livreur_nom.split(' ')[0] : 'Livreur'}/>}

        {/* Commande livrée : message de confirmation */}
        {isLivree && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="font-serif text-[#0D2137] font-bold text-xl mb-1">Commande livrée !</h2>
            <p className="text-gray-500 text-sm mb-3">Merci de faire confiance à Marché en Ligne.</p>
            {commande.points_gagnes > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 inline-flex items-center gap-2">
                <Star size={14} className="text-amber-500" fill="currentColor"/>
                <span className="text-amber-700 text-sm font-bold">+{commande.points_gagnes} points fidélité crédités</span>
              </div>
            )}
            <Link to={`/sondage/${commande.id}`}
              className="block w-full bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
              📋 Donner mon avis (+ 50 pts)
            </Link>
          </div>
        )}

        {/* Timeline de statuts */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-[#0D2137] text-sm mb-4">Progression de votre commande</h3>
          <div className="space-y-0">
            {STATUTS_TIMELINE.map((s, i) => {
              const done    = statutIdx >= i
              const current = statutIdx === i
              const last    = i === STATUTS_TIMELINE.length - 1
              return (
                <div key={s.key} className="flex gap-3">
                  {/* Indicateur */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all
                      ${done ? (current && !isLivree ? 'bg-amber-400 text-gray-900 shadow-md ring-4 ring-amber-100 scale-110' : 'bg-green-500 text-white') : 'bg-gray-100 text-gray-400'}`}>
                      {done ? (isLivree && i === 4 ? '🎉' : i < statutIdx ? <Check size={14}/> : s.emoji) : s.emoji}
                    </div>
                    {!last && <div className={`w-0.5 h-8 ${statutIdx > i ? 'bg-green-400' : 'bg-gray-100'}`}/>}
                  </div>
                  {/* Info */}
                  <div className={`pb-8 flex-1 ${last ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-bold ${done ? 'text-[#0D2137]' : 'text-gray-300'}`}>
                      {s.label}
                      {current && !isLivree && <span className="ml-2 text-xs text-amber-500 font-normal animate-pulse">● En cours</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${done ? 'text-gray-500' : 'text-gray-300'}`}>{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info livreur */}
        {commande.livreur_nom && showGPS && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Votre livreur</p>
            <div className="flex items-center gap-4">
              {/* Photo livreur */}
              <div className="relative shrink-0">
                {commande.livreur_photo ? (
                  <img src={commande.livreur_photo} alt={commande.livreur_nom}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow"/>
                ) : (
                  <div className="w-14 h-14 bg-[#0D2137] rounded-full flex items-center justify-center text-2xl border-2 border-amber-400 shadow">
                    🛵
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"/>
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0D2137] text-sm truncate">{commande.livreur_nom}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={11} className="text-amber-400" fill="currentColor"/>
                  <span className="text-xs text-gray-500">
                    {commande.livreur_note?.toFixed(1) || '0.0'} ·
                    <span className="capitalize ml-1">{commande.livreur_niveau || 'Junior'}</span>
                    {commande.livreur_total_livraisons > 0 && (
                      <span className="ml-1">· {commande.livreur_total_livraisons} livraisons</span>
                    )}
                  </span>
                </div>
                {/* Numéro visible */}
                {commande.livreur_telephone && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{commande.livreur_telephone}</p>
                )}
              </div>
              {/* Bouton appel */}
              <div className="flex gap-2 shrink-0">
                {commande.livreur_telephone ? (
                  <a href={`tel:${commande.livreur_telephone}`}
                    className="w-11 h-11 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
                    <Phone size={16}/>
                  </a>
                ) : (
                  <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                    <Phone size={16}/>
                  </div>
                )}
                <a href={commande.livreur_telephone ? `sms:${commande.livreur_telephone}` : '#'}
                  className="w-11 h-11 bg-[#0D2137] hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
                  <MessageCircle size={16}/>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Récap commande */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-[#0D2137] text-sm mb-3">Récapitulatif</h3>
          {commande.lignes?.map(l => (
            <div key={l.id} className="flex justify-between text-xs text-gray-600 py-1.5 border-b border-gray-50 last:border-0">
              <span className="truncate flex-1">{l.produit_nom || l.nom} × {l.quantite}</span>
              <span className="font-semibold ml-2 shrink-0">{((l.prix_unitaire || 0) * l.quantite).toLocaleString()} F</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-[#0D2137] pt-3 border-t border-gray-100 text-sm mt-2">
            <span>Total payé</span>
            <span className="text-amber-500">{(commande.total_fcfa || 0).toLocaleString()} F</span>
          </div>
        </div>

        {/* Adresse livraison */}
        {commande.adresse && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
            <MapPin size={16} className="text-amber-500 shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-[#0D2137] text-xs">{commande.adresse.libelle}</p>
              <p className="text-gray-500 text-xs">{commande.adresse.quartier}, {commande.adresse.ville}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Link to="/commandes"
            className="border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm text-center hover:border-[#0D2137] hover:text-[#0D2137] transition-colors">
            ← Mes commandes
          </Link>
          {isLivree ? (
            <Link to={`/sondage/${commande.id}`}
              className="bg-amber-400 text-gray-900 font-bold py-3 rounded-xl text-sm text-center hover:bg-amber-500 transition-colors">
              📋 Donner mon avis
            </Link>
          ) : (
            <Link to="/catalogue/menus_ingredients"
              className="bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm text-center hover:bg-amber-400 hover:text-gray-900 transition-all">
              🛒 Nouvelle commande
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
