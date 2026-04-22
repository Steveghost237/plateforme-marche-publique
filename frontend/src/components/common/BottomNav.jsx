import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, ShoppingCart, Package, User } from 'lucide-react'
import { usePanier, useAuth } from '../../store'

const TABS = [
  { to: '/',                    Icon: Home,        label: 'Accueil' },
  { to: '/catalogue/menus_ingredients', Icon: ShoppingBag, label: 'Catalogue' },
  { to: '/panier',              Icon: ShoppingCart, label: 'Panier',   badge: true },
  { to: '/commandes',           Icon: Package,     label: 'Commandes', auth: true },
  { to: '/profil',              Icon: User,        label: 'Profil',    auth: true },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const count = usePanier(s => s.lignes.reduce((a, l) => a + l.quantite, 0))
  const { isAuth } = useAuth()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-stretch">
        {TABS.map(({ to, Icon, label, badge, auth: needAuth }) => {
          if (needAuth && !isAuth) {
            return (
              <Link key={to} to="/connexion"
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400">
                <Icon size={20} strokeWidth={1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          }
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link key={to} to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative min-h-[52px]
                ${active ? 'text-[#0D2137]' : 'text-gray-400'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-gray-900 text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0D2137] rounded-b-full"/>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
