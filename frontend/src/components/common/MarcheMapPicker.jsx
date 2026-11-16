import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Icône marker — l'asset par défaut de Leaflet n'est pas bundlé par Vite
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
})

const YAOUNDE = [3.8480, 11.5021]

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recentrer({ position }) {
  const map = useMap()
  const prev = useRef(position)
  useEffect(() => {
    if (position && position !== prev.current) {
      prev.current = position
      map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.8 })
    }
  }, [position])
  return null
}

/**
 * Carte de choix de position d'un marché.
 * props: position [lat, lon] | null, onPick(lat, lon)
 */
export default function MarcheMapPicker({ position, onPick }) {
  const centre = position || YAOUNDE
  return (
    <MapContainer center={centre} zoom={position ? 15 : 12}
      style={{ height: '220px', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} />
      <Recentrer position={position} />
      {position && <Marker position={position} icon={icon}
        draggable eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onPick(ll.lat, ll.lng) }}} />}
    </MapContainer>
  )
}
