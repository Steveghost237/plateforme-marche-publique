import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { getPasswordStrength } from '../../utils/format'
import PasswordStrength from './PasswordStrength'

/**
 * Formulaire de changement de mot de passe :
 * ancien mot de passe + nouveau + confirmation.
 * Exige le niveau « Fort » pour le nouveau.
 */
export default function ChangerMotDePasse() {
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirme: '' })
  const [show, setShow] = useState({ ancien: false, nouveau: false, confirme: false })
  const [loading, setLoading] = useState(false)
  const strength = getPasswordStrength(form.nouveau)

  const submit = async e => {
    e.preventDefault()
    if (form.nouveau !== form.confirme) { toast.error('La confirmation ne correspond pas au nouveau mot de passe'); return }
    if (!strength.ok) { toast.error('Nouveau mot de passe trop faible — suivez la liste des critères'); return }
    setLoading(true)
    try {
      await api.put('/auth/me/mot-de-passe', { ancien_mot_de_passe: form.ancien, nouveau_mot_de_passe: form.nouveau })
      toast.success('Mot de passe modifié ✓')
      setForm({ ancien: '', nouveau: '', confirme: '' })
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setLoading(false) }
  }

  const champ = (key, label, placeholder) => (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="relative mt-1">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input type={show[key] ? 'text' : 'password'} required value={form[key]}
          onChange={e => setForm({...form, [key]: e.target.value})}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
        <button type="button" onClick={() => setShow({...show, [key]: !show[key]})}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy">
          {show[key] ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
    </div>
  )

  const mismatch = form.confirme && form.nouveau !== form.confirme

  return (
    <form onSubmit={submit} className="space-y-3">
      {champ('ancien', 'Mot de passe actuel', '••••••••')}
      {champ('nouveau', 'Nouveau mot de passe', '8+ car., majuscule, chiffre, spécial')}
      <PasswordStrength password={form.nouveau}/>
      {champ('confirme', 'Confirmer le nouveau mot de passe', 'Retapez le nouveau mot de passe')}
      {mismatch && (
        <p className="text-[11px] text-red-500 font-semibold">⚠️ Les deux mots de passe ne correspondent pas</p>
      )}
      <button type="submit" disabled={loading || !strength.ok || mismatch}
        className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
        {loading ? 'Modification…' : '🔒 Modifier le mot de passe'}
      </button>
      {form.nouveau && !strength.ok && (
        <p className="text-[11px] text-amber-600 font-semibold text-center">
          Le nouveau mot de passe doit atteindre le niveau « Fort »
        </p>
      )}
    </form>
  )
}
