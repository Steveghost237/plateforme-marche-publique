import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../store'

// ── CONNEXION ─────────────────────────────────────────────────
export function Connexion() {
  const [form, setForm] = useState({ telephone: '', mot_de_passe: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/connexion', form)
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`Bienvenue ${data.user.nom_complet?.split(' ')[0]} !`)
      navigate(data.user.role === 'admin' || data.user.role === 'super_admin' ? '/admin'
             : data.user.role === 'livreur' ? '/livreur' : '/')
    } catch(err) {
      toast.error(err.response?.data?.detail || 'Identifiants incorrects')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Bon retour !" subtitle="Connectez-vous à votre compte">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Téléphone</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-10" placeholder="+237 6XX XXX XXX" required
              value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})}/>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Mot de passe</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-10 pr-10" type={show ? 'text' : 'password'} placeholder="••••••••" required
              value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})}/>
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy">
              {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Se connecter <ArrowRight size={16}/></>}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Pas de compte ? <Link to="/inscription" className="text-blue font-semibold hover:underline">S'inscrire</Link>
      </p>
    </AuthLayout>
  )
}

// ── INSCRIPTION (3 étapes) ────────────────────────────────────
export function Inscription() {
  const [step, setStep] = useState(1)
  const [tel, setTel] = useState('')
  const [op, setOp] = useState('MTN')
  const [otp, setOtp] = useState(['','','','','',''])
  const [form, setForm] = useState({ nom_complet:'', mot_de_passe:'' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const step1 = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/auth/inscription/otp', { telephone: tel, operateur: op })
      toast.success('Code OTP envoyé !')
      setStep(2)
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setLoading(false) }
  }

  const step2 = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/auth/inscription/verifier', { telephone: tel, otp_code: otp.join('') })
      setStep(3)
    } catch(err) { toast.error(err.response?.data?.detail || 'OTP incorrect') }
    finally { setLoading(false) }
  }

  const step3 = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/inscription/finaliser', { telephone: tel, ...form })
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success('Compte créé ! Bienvenue 🎉')
      navigate('/')
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setLoading(false) }
  }

  const handleOtp = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez notre communauté">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1,2,3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step > s ? 'bg-forest text-white' : step === s ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step > s ? <Check size={12}/> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-forest' : 'bg-gray-200'}`}/>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={step1} className="space-y-4 animate-fade-up">
          <div>
            <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Numéro de téléphone</label>
            <div className="relative"><Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-10" placeholder="+237 6XX XXX XXX" required value={tel} onChange={e => setTel(e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Opérateur</label>
            <div className="grid grid-cols-2 gap-3">
              {['MTN','Orange'].map(o => (
                <button key={o} type="button" onClick={() => setOp(o)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors
                    ${op === o ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-600 hover:border-navy/30'}`}>
                  {o === 'MTN' ? '🟡' : '🟠'} {o}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Envoyer le code <ArrowRight size={16}/></>}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={step2} className="space-y-5 animate-fade-up">
          <p className="text-sm text-gray-500 text-center">Code envoyé au <strong>{tel}</strong></p>
          <div className="flex gap-2 justify-center">
            {otp.map((d, i) => (
              <input key={i} id={`otp-${i}`} maxLength={1} value={d} onChange={e => handleOtp(i, e.target.value)}
                className="w-11 h-14 border-2 border-gray-200 focus:border-navy rounded-xl text-center text-xl font-bold text-navy focus:outline-none transition-colors"/>
            ))}
          </div>
          <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Vérifier <ArrowRight size={16}/></>}
          </button>
          <button type="button" onClick={() => setStep(1)} className="btn-ghost w-full">← Changer de numéro</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={step3} className="space-y-4 animate-fade-up">
          <div>
            <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Nom complet</label>
            <input className="input" placeholder="Jean-Baptiste Mbarga" required
              value={form.nom_complet} onChange={e => setForm({...form, nom_complet: e.target.value})}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/70 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input className="input pr-10" type={show ? 'text' : 'password'} placeholder="Minimum 8 caractères" required minLength={6}
                value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})}/>
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Créer mon compte 🎉</>}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-4">
        Déjà un compte ? <Link to="/connexion" className="text-blue font-semibold hover:underline">Se connecter</Link>
      </p>
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-cream flex">
      {/* Panneau gauche déco */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(ellipse at 50% 50%, #E8920A, transparent 70%)'}}/>
        <div className="relative text-center px-12">
          <div className="text-7xl mb-6">🏪</div>
          <h2 className="font-serif text-white text-4xl font-bold mb-4">Marché·CM</h2>
          <p className="text-white/60 text-lg leading-relaxed">Votre marché camerounais local livré à domicile, en moins d'une heure.</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[['🛵','Livraison rapide'],['🌿','Produits frais'],['🇨🇲','100% local'],['⭐','Programme fidélité']].map(([e,l]) => (
              <div key={l} className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
                <span className="text-2xl">{e}</span>
                <span className="text-white/70 text-sm">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="font-serif text-navy text-2xl font-bold tracking-widest lg:hidden block mb-8">MARCHÉ<span className="text-amber">·CM</span></Link>
          <h1 className="section-title text-3xl mb-1">{title}</h1>
          <p className="text-gray-500 text-sm mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
