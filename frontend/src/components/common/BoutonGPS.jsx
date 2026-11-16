import { useState } from 'react'
import { MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

// Bouton "Utiliser ma position" : capture le GPS du navigateur et le remonte
// via onCoords({latitude, longitude}). Si refusé, le backend géocode le nom.
export default function BoutonGPS({ onCoords }) {
  const [loading, setLoading] = useState(false)
  const [captured, setCaptured] = useState(false)

  const prendre = () => {
    if (!navigator.geolocation) { toast.error('Géolocalisation non supportée'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setCaptured(true); setLoading(false)
        toast.success('Position GPS enregistrée')
      },
      () => {
        setLoading(false)
        toast.error('Position refusée — l\'adresse sera localisée automatiquement par son nom')
      },
      { timeout: 10000, enableHighAccuracy: true })
  }

  return (
    <button type="button" onClick={prendre}
      className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
        captured ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                 : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
      <MapPin size={14} className={loading ? 'animate-pulse' : ''}/>
      {loading ? 'Localisation en cours…' : captured ? 'Position GPS enregistrée ✓' : 'Utiliser ma position actuelle (plus précis)'}
    </button>
  )
}
