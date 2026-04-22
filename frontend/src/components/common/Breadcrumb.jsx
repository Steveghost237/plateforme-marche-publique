import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-gray-400 py-3 px-4 max-w-7xl mx-auto overflow-x-auto scrollbar-none">
      <Link to="/" className="flex items-center gap-1 hover:text-[#0D2137] transition-colors shrink-0 min-h-[32px]">
        <Home size={12}/> Accueil
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 shrink-0">
          <ChevronRight size={10} className="text-gray-300"/>
          {item.to ? (
            <Link to={item.to} className="hover:text-[#0D2137] transition-colors min-h-[32px] flex items-center">{item.label}</Link>
          ) : (
            <span className="text-[#0D2137] font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
