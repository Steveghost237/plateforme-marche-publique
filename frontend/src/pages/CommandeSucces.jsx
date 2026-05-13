import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Check, XCircle, Loader2, ArrowRight, Smartphone, Phone } from 'lucide-react'
import api from '../utils/api'
import { usePanier } from '../store'
import { useT } from '../store/langStore'

export default function CommandeSucces() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { clear } = usePanier()
  const t = useT()
  const cmdId = sp.get('cmd')
  const mode = sp.get('mode') // stripe | paypal | momo
  const operator = sp.get('operator') // MTN | Orange (pour MoMo)
  const tel = sp.get('tel')
  const [state, setState] = useState('verifying') // verifying | success | error | momo_waiting
  const [error, setError] = useState('')
  const [numero, setNumero] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef(null)
  const cancelledRef = useRef(false)

  // Polling MoMo (jusqu'à 90s = 30 tentatives toutes les 3s)
  const startMomoPolling = () => {
    setState('momo_waiting')
    let attempts = 0
    const MAX_ATTEMPTS = 30
    const poll = async () => {
      if (cancelledRef.current) return
      attempts += 1
      setPollCount(attempts)
      try {
        const { data } = await api.get(`/commandes/${cmdId}/statut-paiement-momo`)
        if (data.status === 'complete' || data.success && data.status === 'complete') {
          setNumero(data.numero || '')
          setState('success')
          clear()
          sessionStorage.removeItem('pending_order')
          return
        }
        if (!data.success || ['failed', 'canceled', 'cancelled', 'rejected'].includes(data.status)) {
          setState('error')
          setError(data.error || `Paiement ${data.status || 'échoué'}`)
          return
        }
        // toujours en attente → réessayer
        if (attempts >= MAX_ATTEMPTS) {
          setState('error')
          setError('Délai dépassé. Vérifiez votre téléphone et réessayez.')
          return
        }
        pollRef.current = setTimeout(poll, 3000)
      } catch (e) {
        setState('error')
        setError(e.response?.data?.detail || e.message)
      }
    }
    poll()
  }

  useEffect(() => {
    cancelledRef.current = false
    if (!cmdId || !mode) { setState('error'); setError('Paramètres manquants'); return }

    if (mode === 'momo') {
      // Démarrer le polling immédiatement
      startMomoPolling()
    } else {
      // Stripe ou PayPal : vérification one-shot
      (async () => {
        try {
          let endpoint = ''
          if (mode === 'stripe') endpoint = `/commandes/${cmdId}/verifier-paiement-stripe`
          else if (mode === 'paypal') endpoint = `/commandes/${cmdId}/verifier-paiement-paypal`
          const { data } = await api.post(endpoint)
          if (data.success !== false) {
            setNumero(data.numero || '')
            setState('success')
            clear()
            sessionStorage.removeItem('pending_order')
          } else {
            setState('error')
            setError(data.error || 'Paiement non confirmé')
          }
        } catch (e) {
          setState('error')
          setError(e.response?.data?.detail || e.response?.data?.error || e.message)
        }
      })()
    }

    return () => {
      cancelledRef.current = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [cmdId, mode])

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8 text-center">
        {state === 'verifying' && (
          <>
            <Loader2 size={48} className="text-[#0D2137] animate-spin mx-auto mb-4"/>
            <h2 className="font-bold text-[#0D2137] text-xl mb-2">{t('verifying_payment')}</h2>
            <p className="text-gray-500 text-sm">{t('please_wait')}</p>
          </>
        )}

        {state === 'momo_waiting' && (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Smartphone size={42} className="text-amber-600"/>
            </div>
            <h2 className="font-bold text-[#0D2137] text-xl mb-2">
              {operator || 'Mobile Money'} — Confirmez sur votre téléphone
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm text-gray-700 mb-2">
                <strong>📱 {tel}</strong>
              </p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Vous allez recevoir une notification {operator === 'Orange' ? 'Orange Money' : 'MTN MoMo'} sur votre téléphone</li>
                <li>Si rien ne s'affiche, composez <strong>{operator === 'Orange' ? '#150*50#' : '*126#'}</strong></li>
                <li>Entrez votre <strong>code PIN</strong> pour confirmer le paiement</li>
                <li>Cette page se mettra à jour automatiquement</li>
              </ol>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 size={14} className="animate-spin"/>
              En attente de confirmation… ({pollCount * 3}s / 90s)
            </div>
            <button
              onClick={() => { cancelledRef.current = true; nav('/panier') }}
              className="mt-6 text-xs text-gray-500 hover:text-red-500 underline">
              Annuler et retourner au panier
            </button>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={42} className="text-green-600"/>
            </div>
            <h2 className="font-bold text-[#0D2137] text-2xl mb-1">{t('payment_confirmed')}</h2>
            <p className="text-amber-500 font-bold text-lg mb-4">{numero}</p>
            <p className="text-gray-500 text-sm mb-6">{t('order_success_msg')}</p>
            <div className="flex gap-3">
              <Link to="/commandes" className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-400 hover:text-gray-900 transition-all">
                {t('view_orders') || 'Mes commandes'} <ArrowRight size={14}/>
              </Link>
              <Link to="/" className="flex-1 border border-gray-200 text-gray-500 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137]">
                {t('back_home') || 'Accueil'}
              </Link>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={42} className="text-red-600"/>
            </div>
            <h2 className="font-bold text-[#0D2137] text-2xl mb-2">{t('payment_failed')}</h2>
            <p className="text-gray-500 text-sm mb-2">{t('payment_failed_msg')}</p>
            <p className="text-red-500 text-xs mb-6 bg-red-50 rounded-lg p-2">{error}</p>
            <div className="flex gap-3">
              <button onClick={() => nav('/panier')} className="flex-1 bg-[#0D2137] text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-400 hover:text-gray-900 transition-all">
                {t('back_to_cart')}
              </button>
              <Link to="/" className="flex-1 border border-gray-200 text-gray-500 font-medium py-3 rounded-xl text-sm hover:border-[#0D2137]">
                {t('back_home') || 'Accueil'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
