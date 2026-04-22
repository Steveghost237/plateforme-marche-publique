import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, ArrowRight, Check, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { isValidCameroonPhone, normalizeCameroonPhone, getPasswordStrength } from '../utils/format'

export default function MotDePasseOublie() {
  const [step, setStep] = useState(1)
  const [tel, setTel] = useState('')
  const [otp, setOtp] = useState(['','','','','',''])
  const [resetToken, setResetToken] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const sendOtp = async e => {
    e.preventDefault()
    if (!isValidCameroonPhone(tel)) { toast.error('Numéro camerounais invalide'); return }
    setLoading(true)
    try {
      await api.post('/auth/mot-de-passe-oublie/otp', { telephone: normalizeCameroonPhone(tel) })
      toast.success('Code envoyé par SMS')
      setStep(2)
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setLoading(false) }
  }

  const verifyOtp = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/mot-de-passe-oublie/verifier', {
        telephone: normalizeCameroonPhone(tel), otp_code: otp.join('')
      })
      setResetToken(data.reset_token)
      setStep(3)
    } catch(err) { toast.error(err.response?.data?.detail || 'Code incorrect') }
    finally { setLoading(false) }
  }

  const resetPassword = async e => {
    e.preventDefault()
    if (newPwd.length < 6) { toast.error('Minimum 6 caractères'); return }
    setLoading(true)
    try {
      await api.post('/auth/mot-de-passe-oublie/reset', {
        reset_token: resetToken, nouveau_mot_de_passe: newPwd
      })
      toast.success('Mot de passe réinitialisé ! Connectez-vous.')
      navigate('/connexion')
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setLoading(false) }
  }

  const handleOtp = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`rotp-${i+1}`)?.focus()
  }

  const strength = getPasswordStrength(newPwd)

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0D2137] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-amber-400"/>
          </div>
          <h1 className="font-serif text-[#0D2137] text-2xl font-bold">
            {step === 1 && 'Mot de passe oublié'}
            {step === 2 && 'Vérification'}
            {step === 3 && 'Nouveau mot de passe'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 && 'Entrez votre numéro pour recevoir un code'}
            {step === 2 && `Code envoyé au ${tel}`}
            {step === 3 && 'Choisissez un nouveau mot de passe sécurisé'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1,2,3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-[#0D2137] text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {step > s ? <Check size={12}/> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`}/>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Numéro de téléphone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#0D2137]"
                    placeholder="+237 6XX XXX XXX" required type="tel" inputMode="numeric"
                    value={tel} onChange={e => setTel(e.target.value)}/>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Envoyer le code <ArrowRight size={16}/></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="flex gap-2 justify-center">
                {otp.map((d, i) => (
                  <input key={i} id={`rotp-${i}`} maxLength={1} value={d} onChange={e => handleOtp(i, e.target.value)}
                    type="tel" inputMode="numeric"
                    className="w-11 h-14 border-2 border-gray-200 focus:border-[#0D2137] rounded-xl text-center text-xl font-bold text-[#0D2137] focus:outline-none transition-colors"/>
                ))}
              </div>
              <button type="submit" disabled={loading || otp.join('').length < 6}
                className="w-full bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Vérifier <ArrowRight size={16}/></>}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-gray-500 text-sm hover:text-[#0D2137]">← Changer de numéro</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-[#0D2137]"
                    type={show ? 'text' : 'password'} placeholder="Minimum 8 caractères" required minLength={6}
                    value={newPwd} onChange={e => setNewPwd(e.target.value)}/>
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {newPwd && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-gray-200'}`}/>)}
                    </div>
                    <p className={`text-[10px] font-semibold ${strength.text}`}>{strength.label}</p>
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0D2137] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-amber-400 hover:text-gray-900 transition-all disabled:opacity-40">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Réinitialiser <Check size={16}/></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/connexion" className="text-[#0D2137] font-semibold hover:underline">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  )
}
