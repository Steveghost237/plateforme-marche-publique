import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '237600000000'
const DEFAULT_MESSAGE = 'Bonjour Marché·CM ! J\'ai une question concernant votre service de livraison.'

export default function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-20 sm:bottom-6 right-4 z-40 w-14 h-14 bg-[#25D366] hover:bg-[#1DA851] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      aria-label="Contacter sur WhatsApp">
      <MessageCircle size={26} className="text-white" fill="white" />
      <span className="absolute right-full mr-3 bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Besoin d'aide ?
      </span>
    </a>
  )
}
