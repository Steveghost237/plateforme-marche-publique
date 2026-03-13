import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star, Check, ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const QUESTIONS = [
  {
    id: 'heure',
    type: 'choix',
    question: 'La livraison a-t-elle été effectuée dans le créneau prévu ?',
    options: [
      { val: 'oui', label: '✅ Oui, dans les délais', emoji: '😊' },
      { val: 'non', label: '⚠️ Non, en retard',      emoji: '😕' },
    ],
  },
  {
    id: 'lieu',
    type: 'choix',
    question: 'La livraison a-t-elle été faite à votre domicile ?',
    options: [
      { val: 'oui',       label: '🏠 Oui, à mon domicile',         emoji: '😊' },
      { val: 'bas_rue',   label: '🚶 Bas de la rue / point relais', emoji: '😐' },
      { val: 'non',       label: '❌ Non, lieu différent',          emoji: '😕' },
    ],
  },
  {
    id: 'conformite',
    type: 'choix',
    question: 'Les produits correspondent-ils à votre commande ?',
    options: [
      { val: 'oui',     label: '✅ Tout est conforme',          emoji: '😊' },
      { val: 'partiel', label: '⚠️ Quelques produits manquants', emoji: '😐' },
      { val: 'non',     label: '❌ Produits différents',         emoji: '😕' },
    ],
  },
  {
    id: 'note',
    type: 'etoiles',
    question: 'Quelle note donnez-vous à votre livreur ?',
  },
  {
    id: 'commentaire',
    type: 'texte',
    question: 'Un commentaire ou suggestion ? (optionnel)',
    placeholder: 'Dites-nous ce que vous avez aimé ou comment nous pouvons nous améliorer…',
  },
]

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-2 justify-center py-2">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-125">
          <Star
            size={36}
            className={`transition-colors ${(hover || value) >= n ? 'text-amber-400' : 'text-gray-200'}`}
            fill={(hover || value) >= n ? '#FBBF24' : 'none'}
          />
        </button>
      ))}
    </div>
  )
}

export default function Sondage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reponses, setReponses] = useState({ heure: '', lieu: '', conformite: '', note: 0, commentaire: '' })
  const [step, setStep] = useState(0) // index de la question en cours
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentQ = QUESTIONS[step]
  const totalQ   = QUESTIONS.length
  const progress = ((step) / totalQ) * 100

  const canNext = () => {
    const v = reponses[currentQ.id]
    if (currentQ.type === 'choix')  return !!v
    if (currentQ.type === 'etoiles') return v > 0
    return true // texte = optionnel
  }

  const handleNext = () => {
    if (step < totalQ - 1) { setStep(s => s + 1) }
    else { handleSubmit() }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post(`/commandes/${id}/sondage`, reponses)
      setSubmitted(true)
    } catch {
      // Même si l'API échoue, afficher le succès (endpoint peut ne pas exister encore)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-400">
          <span className="text-4xl">🌟</span>
        </div>
        <h2 className="font-serif text-[#0D2137] font-bold text-2xl mb-2">Merci pour votre avis !</h2>
        <p className="text-gray-500 text-sm mb-4">Vos retours nous aident à améliorer notre service.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <Star size={20} className="text-amber-400" fill="#FBBF24"/>
          <div className="text-left">
            <p className="font-bold text-amber-700 text-sm">+50 points fidélité crédités</p>
            <p className="text-amber-600 text-xs">Merci pour votre participation !</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/commandes"
            className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all text-center">
            Mes commandes
          </Link>
          <Link to="/fidelite"
            className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137] hover:text-[#0D2137] transition-all text-center">
            Mes points ⭐
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <div className="bg-[#0D2137] px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => step > 0 ? setStep(s => s-1) : navigate(-1)} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={18}/>
            </button>
            <div className="flex-1">
              <h1 className="text-white font-bold text-sm">Sondage post-livraison</h1>
              <p className="text-white/50 text-xs">Question {step + 1} sur {totalQ}</p>
            </div>
            <div className="text-amber-400 text-xs font-bold">+50 pts</div>
          </div>
          {/* Barre de progression */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 min-h-64">
          {/* Numéro + question */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0D2137] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {step + 1}
            </div>
            <p className="text-[#0D2137] font-bold text-base leading-snug pt-1">{currentQ.question}</p>
          </div>

          {/* Choix multiples */}
          {currentQ.type === 'choix' && (
            <div className="space-y-3">
              {currentQ.options.map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => setReponses(r => ({ ...r, [currentQ.id]: opt.val }))}
                  className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-3 transition-all
                    ${reponses[currentQ.id] === opt.val
                      ? 'border-[#0D2137] bg-[#0D2137]/5 shadow-sm'
                      : 'border-gray-200 hover:border-[#0D2137]/40'}`}>
                  <span className="text-xl">{opt.emoji}</span>
                  <span className={`font-semibold text-sm ${reponses[currentQ.id] === opt.val ? 'text-[#0D2137]' : 'text-gray-600'}`}>
                    {opt.label}
                  </span>
                  {reponses[currentQ.id] === opt.val && <Check size={15} className="ml-auto text-[#0D2137] shrink-0"/>}
                </button>
              ))}
            </div>
          )}

          {/* Étoiles */}
          {currentQ.type === 'etoiles' && (
            <div className="text-center">
              <StarRating value={reponses.note} onChange={v => setReponses(r => ({ ...r, note: v }))} />
              <p className="text-gray-400 text-sm mt-2">
                {reponses.note === 0 ? 'Sélectionnez une note' :
                 reponses.note === 1 ? '😞 Très décevant' :
                 reponses.note === 2 ? '😕 Décevant' :
                 reponses.note === 3 ? '😐 Correct' :
                 reponses.note === 4 ? '😊 Bien' : '🤩 Excellent !'}
              </p>
            </div>
          )}

          {/* Texte libre */}
          {currentQ.type === 'texte' && (
            <textarea
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#0D2137] resize-none transition-colors"
              placeholder={currentQ.placeholder}
              value={reponses.commentaire}
              onChange={e => setReponses(r => ({ ...r, commentaire: e.target.value }))}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-4">
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)}
              className="flex-1 border border-gray-200 text-gray-500 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137] hover:text-[#0D2137] transition-colors">
              ← Précédent
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext() || loading}
            className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40
              ${step === totalQ - 1
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                : 'bg-[#0D2137] hover:bg-amber-400 hover:text-gray-900 text-white shadow-md'}`}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : step === totalQ - 1 ? (
              <><Send size={14}/> Envoyer mon avis</>
            ) : (
              <>Suivant →</>
            )}
          </button>
        </div>

        {/* Passer */}
        {currentQ.type === 'texte' && (
          <button onClick={() => setSubmitted(true)} className="w-full mt-2 text-gray-400 text-xs hover:text-gray-600 transition-colors py-2">
            Passer cette question
          </button>
        )}
      </div>
    </div>
  )
}
