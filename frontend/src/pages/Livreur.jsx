import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, Package, Star, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../store'

export function LiveurDashboard() {
  const { user, isAuth } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [disponibles, setDisponibles] = useState([])
  const [historique, setHistorique] = useState([])
  const [tab, setTab] = useState('dispo')

  useEffect(() => {
    if (!isAuth || user?.role !== 'livreur') { navigate('/'); return }
    loadData()
  }, [isAuth])

  const loadData = async () => {
    try {
      const [p, d, h] = await Promise.all([
        api.get('/livreur/profil'),
        api.get('/commandes/livreur/disponibles'),
        api.get('/livreur/historique'),
      ])
      setProfil(p.data); setDisponibles(d.data); setHistorique(h.data)
    } catch {}
  }

  const toggleDispo = async () => {
    const nouveau = profil?.statut === 'disponible' ? 'hors_ligne' : 'disponible'
    try {
      await api.put('/livreur/statut', { statut: nouveau })
      setProfil(prev => ({...prev, statut: nouveau}))
      toast.success(nouveau === 'disponible' ? 'Vous êtes maintenant disponible' : 'Vous êtes hors ligne')
    } catch { toast.error('Erreur') }
  }

  const accepter = async (id) => {
    try {
      await api.post(`/commandes/${id}/accepter`)
      toast.success('Commande acceptée !')
      loadData()
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const changerStatut = async (id, statut) => {
    try {
      await api.post(`/commandes/${id}/statut`, { statut })
      toast.success(`Statut mis à jour: ${statut.replace(/_/g,' ')}`)
      loadData()
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const NIVEAU_INFO = { junior:{ label:'Junior', emoji:'🟢' }, senior:{ label:'Senior', emoji:'🔵' }, expert:{ label:'Expert', emoji:'🟡' }, elite:{ label:'Élite', emoji:'🔴' } }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="font-serif text-white text-2xl">Espace Livreur</h1>
              <p className="text-white/60 text-sm">Bonjour, {user?.nom_complet?.split(' ')[0]} 👋</p>
            </div>
            {profil && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${profil.statut === 'disponible' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}
                onClick={toggleDispo}>
                {profil.statut === 'disponible' ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                <span className="text-sm font-semibold">{profil.statut === 'disponible' ? 'Disponible' : 'Hors ligne'}</span>
              </div>
            )}
          </div>

          {profil && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { val: profil.note_moyenne?.toFixed(1) || '0.0', label:'Note ⭐' },
                { val: profil.total_livraisons || 0, label:'Livraisons' },
                { val: `${(profil.total_gains_fcfa || 0).toLocaleString()} F`, label:'Gains totaux' },
                { val: (NIVEAU_INFO[profil.niveau] || NIVEAU_INFO.junior).emoji + ' ' + (NIVEAU_INFO[profil.niveau]?.label || profil.niveau), label:'Niveau' },
              ].map(k => (
                <div key={k.label} className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-white font-bold text-sm">{k.val}</div>
                  <div className="text-white/40 text-xs mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6">
          {[['dispo','Disponibles'], ['histo','Historique']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'dispo' && (
          <div className="space-y-4">
            {disponibles.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Package size={40} className="mx-auto mb-4 opacity-30"/>
                <p>Aucune commande disponible</p>
                <p className="text-sm mt-1">Passez en mode disponible pour recevoir des commandes</p>
              </div>
            ) : disponibles.map(c => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-navy">{c.numero}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{c.creneau?.replace(/_/g,' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber text-lg">{c.total_fcfa?.toLocaleString()} F</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 flex gap-3">
                  <button onClick={() => accepter(c.id)} className="btn-primary flex-1 text-sm py-2">
                    ✅ Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'histo' && (
          <div className="space-y-3">
            {historique.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle size={40} className="mx-auto mb-4 opacity-30"/>
                <p>Aucune livraison effectuée</p>
              </div>
            ) : historique.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-navy text-sm">{c.numero}</p>
                  <p className="text-gray-400 text-xs">{c.livree_at ? new Date(c.livree_at).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber">{c.total_fcfa?.toLocaleString()} F</p>
                  <span className="badge-green text-xs">✅ Livrée</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
