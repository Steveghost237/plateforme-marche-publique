import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Search, Camera, Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const SECTIONS = [
  { code: '',                  label: 'Toutes les sections', emoji: '📦' },
  { code: 'menus_ingredients', label: 'Menus & Ingrédients', emoji: '🥘' },
  { code: 'fruits',            label: 'Fruits & Légumes',    emoji: '🍊' },
  { code: 'boissons',          label: 'Boissons',            emoji: '🥤' },
  { code: 'boulangerie',       label: 'Boulangerie',         emoji: '🍞' },
  { code: 'epices',            label: 'Épices & Condiments', emoji: '🌶️' },
]

function imgSrc(url) {
  if (!url) return null
  return url
}

export default function AdminImages() {
  const [section, setSection] = useState('')
  const [q, setQ]             = useState('')
  const [produits, setProduits] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(null)
  const fileRef = useRef(null)
  const [targetId, setTargetId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page })
      if (section) params.set('section', section)
      if (q) params.set('q', q)
      const { data } = await api.get(`/admin/prix/?${params}`)
      setProduits(data.produits); setTotal(data.total)
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [section, q, page])

  useEffect(() => { load() }, [load])

  const triggerUpload = (produitId) => {
    setTargetId(produitId)
    fileRef.current?.click()
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !targetId) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5 Mo)'); return
    }
    setUploading(targetId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post(`/catalogue/produits/${targetId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProduits(prev => prev.map(p =>
        p.id === targetId ? { ...p, image_url: data.image_url } : p
      ))
      toast.success('Photo mise à jour !')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur upload')
    } finally {
      setUploading(null)
      setTargetId(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const pages = Math.ceil(total / 50)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Header */}
      <div className="bg-[#0D2137] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">📸 Gestion des Photos</h1>
            <p className="text-white/50 text-xs">{total} produit{total !== 1 ? 's' : ''} — Cliquez sur une photo pour la modifier</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
              placeholder="Rechercher un produit…"
              value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D2137]"
            value={section} onChange={e => { setSection(e.target.value); setPage(1) }}>
            {SECTIONS.map(s => <option key={s.code} value={s.code}>{s.emoji} {s.label}</option>)}
          </select>
        </div>

        {/* Grille produits */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-2 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : produits.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {produits.map(p => {
              const isUploading = uploading === p.id
              const src = imgSrc(p.image_url)
              const hasImage = !!src

              return (
                <div key={p.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  {/* Image zone */}
                  <button
                    onClick={() => triggerUpload(p.id)}
                    disabled={isUploading}
                    className="relative w-full aspect-square bg-gray-50 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded-t-2xl"
                  >
                    {hasImage ? (
                      <img src={src} alt={p.nom}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon size={32} />
                        <span className="text-xs mt-1">Pas de photo</span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200
                      ${isUploading ? 'bg-black/50 opacity-100' : 'bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                      {isUploading ? (
                        <Loader2 size={28} className="text-white animate-spin" />
                      ) : (
                        <>
                          <Camera size={24} className="text-white mb-1" />
                          <span className="text-white text-xs font-semibold">Changer la photo</span>
                        </>
                      )}
                    </div>

                    {/* Badge local / externe */}
                    {hasImage && (
                      <div className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm
                        ${p.image_url?.startsWith('/uploads/') ? 'bg-green-500 text-white' : 'bg-gray-700/70 text-white/80'}`}>
                        {p.image_url?.startsWith('/uploads/') ? '✓ Local' : 'URL'}
                      </div>
                    )}
                  </button>

                  {/* Infos produit */}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-[#0D2137] truncate" title={p.nom}>{p.nom}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.section_code}</span>
                      <span className="text-[10px] font-bold text-amber-600">{(p.prix_base_fcfa || 0).toLocaleString()} F</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-30 hover:border-[#0D2137] transition-colors">
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
