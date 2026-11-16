// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import Navbar from './components/common/Navbar'
import Footer from './components/common/Footer'
import Accueil from './pages/Accueil'
import { Connexion, Inscription } from './pages/Auth'
import MotDePasseOublie from './pages/MotDePasseOublie'
import { Catalogue, ProduitDetail, Recherche } from './pages/Catalogue'
import { Panier, Checkout } from './pages/Panier'
import { Profil, MesCommandes, MesAdresses, Aide, Fidelite, Notifications } from './pages/Compte'
import SuiviCommande from './pages/SuiviCommande'
import CommandeSucces from './pages/CommandeSucces'
import Sondage from './pages/Sondage'
import { AdminDashboard } from './pages/Admin'
import AdminCommandes from './pages/AdminCommandes'
import AdminLivreurs from './pages/AdminLivreurs'
import AdminClients from './pages/AdminClients'
import AdminStats from './pages/AdminStats'
import AdminSuggestions from './pages/AdminSuggestions'
import AdminPrix from './pages/AdminPrix'
import AdminLivraison from './pages/AdminLivraison'
import AdminImages from './pages/AdminImages'
import AdminMonitoring from './pages/AdminMonitoring'
import AdminAgents from './pages/AdminAgents'
import AdminAdministrateurs from './pages/AdminAdministrateurs'
import AdminPointsAchat from './pages/AdminPointsAchat'
import { LiveurDashboard } from './pages/Livreur'
import { useAuth } from './store'
import api from './utils/api'
import { playNotifSound } from './utils/sound'
import WhatsAppButton from './components/common/WhatsAppButton'
import BottomNav from './components/common/BottomNav'
import { useRef } from 'react'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-10 h-10 border-3 border-navy/20 border-t-navy rounded-full animate-spin"/>
    </div>
  )
}

function ProtectedRoute({ children, roles }) {
  const { isAuth, user } = useAuth()
  if (!isAuth) return <Navigate to="/connexion" replace/>
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace/>
  return children
}

// Surveille les notifications non lues et émet un son à chaque nouvelle
function NotificationWatcher() {
  const { isAuth } = useAuth()
  const prevCount = useRef(null)
  useEffect(() => {
    if (!isAuth) { prevCount.current = null; return }
    const check = async () => {
      try {
        const { data } = await api.get('/notifications/?non_lues=true')
        const n = data?.length || 0
        if (prevCount.current !== null && n > prevCount.current) playNotifSound()
        prevCount.current = n
      } catch {}
    }
    check()
    const iv = setInterval(check, 15000)
    return () => clearInterval(iv)
  }, [isAuth])
  return null
}

// Pages avec navbar+footer
function PublicLayout({ children }) {
  return <>
    <Navbar/>
    <main className="pb-14 sm:pb-0">{children}</main>
    <Footer className="hidden sm:block"/>
    <BottomNav/>
    <WhatsAppButton/>
  </>
}

export default function App() {
  const { fetchMe, isAuth } = useAuth()

  useEffect(() => { if (isAuth) fetchMe() }, [])

  return (
    <Suspense fallback={<Spinner/>}>
      <NotificationWatcher/>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<PublicLayout><Accueil/></PublicLayout>}/>
        <Route path="/connexion"  element={<Connexion/>}/>
        <Route path="/inscription" element={<Inscription/>}/>
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie/>}/>
        <Route path="/recherche"  element={<PublicLayout><Recherche/></PublicLayout>}/>
        <Route path="/catalogue/:section" element={<PublicLayout><Catalogue/></PublicLayout>}/>
        <Route path="/produit/:slug" element={<PublicLayout><ProduitDetail/></PublicLayout>}/>
        <Route path="/panier"     element={<PublicLayout><Panier/></PublicLayout>}/>
        <Route path="/commande/succes" element={<PublicLayout><CommandeSucces/></PublicLayout>}/>
        <Route path="/commande/succes/" element={<PublicLayout><CommandeSucces/></PublicLayout>}/>

        {/* PROTÉGÉES */}
        <Route path="/commande"   element={<ProtectedRoute><Checkout/></ProtectedRoute>}/>
        <Route path="/commandes"  element={<ProtectedRoute><PublicLayout><MesCommandes/></PublicLayout></ProtectedRoute>}/>
        <Route path="/profil"     element={<ProtectedRoute><PublicLayout><Profil/></PublicLayout></ProtectedRoute>}/>
        <Route path="/fidelite"   element={<ProtectedRoute><PublicLayout><Fidelite/></PublicLayout></ProtectedRoute>}/>
        <Route path="/notifications" element={<ProtectedRoute><PublicLayout><Notifications/></PublicLayout></ProtectedRoute>}/>
        <Route path="/adresses" element={<ProtectedRoute><PublicLayout><MesAdresses/></PublicLayout></ProtectedRoute>}/>
        <Route path="/aide" element={<PublicLayout><Aide/></PublicLayout>}/>
        <Route path="/suivi/:id"  element={<ProtectedRoute><SuiviCommande/></ProtectedRoute>}/>
        <Route path="/sondage/:id" element={<ProtectedRoute><Sondage/></ProtectedRoute>}/>

        {/* LIVREUR */}
        <Route path="/livreur" element={<ProtectedRoute roles={['livreur','admin','super_admin']}><LiveurDashboard/></ProtectedRoute>}/>

        {/* ADMIN */}
        <Route path="/admin"                  element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminDashboard/></ProtectedRoute>}/>
        <Route path="/admin/commandes"        element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminCommandes/></ProtectedRoute>}/>
        <Route path="/admin/livreurs"         element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminLivreurs/></ProtectedRoute>}/>
        <Route path="/admin/clients"          element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminClients/></ProtectedRoute>}/>
        <Route path="/admin/stats"            element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminStats/></ProtectedRoute>}/>
        <Route path="/admin/suggestions"      element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminSuggestions/></ProtectedRoute>}/>
        <Route path="/admin/prix"             element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminPrix/></ProtectedRoute>}/>
        <Route path="/admin/livraison"        element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminLivraison/></ProtectedRoute>}/>
        <Route path="/admin/images"           element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminImages/></ProtectedRoute>}/>
        <Route path="/admin/monitoring"      element={<ProtectedRoute roles={['admin','super_admin','agent']}><AdminMonitoring/></ProtectedRoute>}/>
        <Route path="/admin/agents"          element={<ProtectedRoute roles={['admin','super_admin']}><AdminAgents/></ProtectedRoute>}/>
        <Route path="/admin/administrateurs" element={<ProtectedRoute roles={['admin','super_admin']}><AdminAdministrateurs/></ProtectedRoute>}/>
        <Route path="/admin/points-achat"    element={<ProtectedRoute roles={['admin','super_admin']}><AdminPointsAchat/></ProtectedRoute>}/>

        {/* 404 */}
        <Route path="*" element={
          <PublicLayout>
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
              <div className="text-6xl mb-4">🔍</div>
              <h1 className="font-serif text-navy text-4xl mb-2">Page introuvable</h1>
              <p className="text-gray-400 mb-6">La page que vous cherchez n'existe pas.</p>
              <a href="/" className="btn-primary">Retour à l'accueil</a>
            </div>
          </PublicLayout>
        }/>
      </Routes>
    </Suspense>
  )
}
