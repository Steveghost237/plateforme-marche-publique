import { Globe } from 'lucide-react'
import { useLang, useT } from '../../store/langStore'
import { applyGoogleLang } from '../../utils/translate'

// variant 'bouton' : libellé EN/FR (navbar, sidebar admin)
// variant 'icone'  : bouton carré compact (header livreur)
export default function BoutonLangue({ variant = 'bouton' }) {
  const { lang, setLang } = useLang()
  const t = useT()
  const cible = lang === 'fr' ? 'en' : 'fr'

  const changer = () => {
    setLang(cible)          // nav + libellés issus du dictionnaire local
    applyGoogleLang(cible)  // traduction complète de la page (recharge)
  }

  if (variant === 'icone') {
    return (
      <button onClick={changer} title={t('lang_switch_tooltip')}
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
        <Globe size={15}/>
      </button>
    )
  }
  return (
    <button onClick={changer} title={t('lang_switch_tooltip')}
      className="flex items-center gap-1 px-2 py-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 text-xs font-bold border border-white/15">
      <Globe size={14}/>
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  )
}
