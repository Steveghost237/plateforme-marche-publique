import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getImageUrl, apiErr } from '../../utils/api'
import { useAuth } from '../../store'

// ── Photo de profil uploadable — tous les rôles (client, livreur, agent, admin).
//    Affiche l'avatar actuel (ou les initiales) + bouton caméra. Met à jour le
//    store auth et le serveur (POST /uploads/avatar). ────────────────────────────
export default function AvatarUpload({ size = 'lg', className = '' }) {
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const dim = { xs: 'w-7 h-7', sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-20 h-20', xl: 'w-24 h-24' }[size] || 'w-20 h-20'
  const cam = size === 'xs' ? 'w-4 h-4' : 'w-7 h-7'
  const camIcon = size === 'xs' ? 9 : 13
  const initials = user?.nom_complet?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const envoyer = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const { data } = await api.post('/uploads/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      useAuth.setState({ user: { ...user, avatar_url: data.avatar_url } })
      toast.success('Photo de profil mise à jour')
    } catch (err) {
      toast.error(apiErr(err, "Échec de l'upload"))
    } finally { setUploading(false) }
  }

  return (
    <div className={`relative ${dim} ${className}`}>
      <div className={`${dim} rounded-full overflow-hidden bg-white/20 flex items-center justify-center`}>
        {user?.avatar_url ? (
          <img src={getImageUrl(user.avatar_url)} alt="" className="w-full h-full object-cover"/>
        ) : (
          <span className={`font-bold text-white/80 ${size === 'xs' ? 'text-[10px]' : 'text-xl'}`}>{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          </div>
        )}
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        title="Changer la photo"
        className={`absolute -bottom-0.5 -right-0.5 ${cam} bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-full flex items-center justify-center shadow transition-colors disabled:opacity-60`}>
        <Camera size={camIcon}/>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={envoyer}/>
    </div>
  )
}
