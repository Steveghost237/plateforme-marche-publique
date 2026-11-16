import { Check, X } from 'lucide-react'
import { getPasswordStrength } from '../../utils/format'

/**
 * Indicateur dynamique de force du mot de passe.
 * Affiche la barre de progression + la liste des critères à remplir.
 * `s.ok` === true quand le mot de passe atteint le niveau "fort" (minimum exigé).
 */
export default function PasswordStrength({ password }) {
  if (!password) return null
  const s = getPasswordStrength(password)
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= s.score ? s.color : 'bg-gray-200'}`}/>
        ))}
      </div>
      <p className={`text-[11px] font-bold ${s.text} mb-2`}>
        {s.label}{s.ok ? '' : ' — minimum requis : Fort'}
      </p>
      <ul className="space-y-1">
        {s.checks.map(c => (
          <li key={c.key} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            {c.ok ? <Check size={11} className="shrink-0"/> : <X size={11} className="shrink-0 text-gray-300"/>}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
