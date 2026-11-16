import { getImageUrl } from '../../utils/api'

// ── Avatar en lecture seule : photo si dispo, sinon initiales.
//    bg/text permettent de colorer le fallback (ex : par rôle). ──
const DIMS = { xs: 'w-7 h-7', sm: 'w-8 h-8', md: 'w-9 h-9', ml: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20', xxl: 'w-24 h-24' }
const TEXT = { xs: 'text-[10px]', sm: 'text-xs', md: 'text-sm', ml: 'text-base', lg: 'text-xl', xl: 'text-2xl', xxl: 'text-3xl' }

export default function Avatar({ user, size = 'sm', className = '', bg = 'bg-amber-500', text = 'text-gray-900' }) {
  const dim = DIMS[size] || DIMS.sm
  const initials = user?.nom_complet?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  return (
    <div className={`${dim} rounded-full overflow-hidden ${bg} flex items-center justify-center shrink-0 ${className}`}>
      {user?.avatar_url ? (
        <img src={getImageUrl(user.avatar_url)} alt={user?.nom_complet || ''} className="w-full h-full object-cover"/>
      ) : (
        <span className={`font-bold ${text} ${TEXT[size] || TEXT.sm}`}>{initials}</span>
      )}
    </div>
  )
}
