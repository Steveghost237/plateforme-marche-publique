import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Search, Bell, Menu, X, ChevronDown, LogOut, User, Package, Star, Shield, Bike } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth, usePanier } from '../../store'
import api from '../../utils/api'

const NAV_LINKS = [
  { label:'Menus',       href:'/catalogue/menus_ingredients' },
  { label:'Fruits',      href:'/catalogue/fruits' },
  { label:'Boissons',    href:'/catalogue/boissons' },
  { label:'Boulangerie', href:'/catalogue/boulangerie' },
  { label:'Épices',      href:'/catalogue/epices' },
]

export default function Navbar() {
  const { user, isAuth, logout } = useAuth()
  const lignes     = usePanier(s => s.lignes)
  const count      = lignes.reduce((a, l) => a + l.quantite, 0)
  const [menu, setMenu]       = useState(false)
  const [drop, setDrop]       = useState(false)
  const [notifN, setNotifN]   = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => { setMenu(false); setDrop(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isAuth) return
    api.get('/notifications/?non_lues=true').then(r => setNotifN(r.data.length)).catch(() => {})
  }, [isAuth, pathname])

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#071220] shadow-2xl' : 'bg-[#0D2137]'}`}>
      {/* Bandeau promo */}
      <div className="bg-amber-500 text-gray-900 text-center text-xs py-1.5 font-semibold tracking-wide">
        Livraison à domicile — Yaoundé &amp; Douala · Frais de livraison à partir de 500 FCFA seulement
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo-comebuy.png" alt="ComeBuy Logo" className="h-12 w-auto" />
        </Link>

        {/* Nav desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(n => (
            <Link key={n.href} to={n.href}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname.startsWith(n.href) ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/recherche"
            className="p-2 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/10">
            <Search size={18}/>
          </Link>

          {isAuth && (
            <Link to="/notifications"
              className="relative p-2 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/10">
              <Bell size={18}/>
              {notifN > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {notifN > 9 ? '9+' : notifN}
                </span>
              )}
            </Link>
          )}

          <Link to="/panier"
            className="relative p-2 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/10">
            <ShoppingCart size={18}/>
            {count > 0 && (
              <span className="absolute top-1 right-1 bg-amber-500 text-gray-900 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {isAuth ? (
            <div className="relative">
              <button onClick={() => setDrop(!drop)}
                className="flex items-center gap-2 bg-white/8 hover:bg-white/15 rounded-xl px-3 py-1.5 transition-colors border border-white/10">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 text-xs font-bold overflow-hidden">
                  {user?.nom_complet?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-white text-sm font-medium hidden sm:block max-w-24 truncate">
                  {user?.nom_complet?.split(' ')[0]}
                </span>
                <ChevronDown size={13} className={`text-white/50 transition-transform ${drop ? 'rotate-180' : ''}`}/>
              </button>

              {drop && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-[#0D2137]">{user?.nom_complet}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.telephone}</p>
                    <span className={`mt-1.5 inline-block text-xs font-bold px-2 py-0.5 rounded-full capitalize
                      ${user?.role==='admin'||user?.role==='super_admin' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user?.role}
                    </span>
                  </div>

                  {[
                    { to:'/profil',    Icon:User,    label:'Mon profil' },
                    { to:'/commandes', Icon:Package, label:'Mes commandes' },
                    { to:'/fidelite',  Icon:Star,    label:'Programme Fidélité' },
                  ].map(({ to, Icon, label }) => (
                    <Link key={to} to={to} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#0D2137] hover:bg-[#F5EFE6] transition-colors">
                      <Icon size={14} className="text-gray-400"/>{label}
                    </Link>
                  ))}

                  {(user?.role==='admin'||user?.role==='super_admin') && (
                    <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-700 font-semibold hover:bg-amber-50 transition-colors">
                      <Shield size={14}/> Administration
                    </Link>
                  )}
                  {user?.role==='livreur' && (
                    <Link to="/livreur" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-700 font-semibold hover:bg-blue-50 transition-colors">
                      <Bike size={14}/> Espace Livreur
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full">
                      <LogOut size={14}/> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/connexion"
              className="bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              Connexion
            </Link>
          )}

          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2 text-white/55 hover:text-white">
            {menu ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menu && (
        <div className="lg:hidden bg-[#071220] border-t border-white/8 px-4 pb-5 pt-3">
          {NAV_LINKS.map(n => (
            <Link key={n.href} to={n.href}
              className="block py-3 text-white/60 hover:text-white text-sm font-medium border-b border-white/5 transition-colors">
              {n.label}
            </Link>
          ))}
          {!isAuth && (
            <Link to="/inscription" className="block mt-4 text-center bg-amber-500 text-gray-900 font-bold py-3 rounded-xl text-sm">
              Créer un compte gratuit
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
