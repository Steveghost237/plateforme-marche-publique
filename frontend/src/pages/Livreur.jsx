import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, Package, Star, Clock, ToggleLeft, ToggleRight, Phone, MessageCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../store'

const STATUT_LABELS = {
  assignee:        { label: 'Assigné',        color: 'bg-blue-100 text-blue-700',   emoji: '🔵' },
  en_cours_marche: { label: 'Au marché',       color: 'bg-amber-100 text-amber-700', emoji: '🛒' },
  en_livraison:    { label: 'En livraison',    color: 'bg-green-100 text-green-700', emoji: '🛵' },
}

const NEXT_STATUT = {
  assignee:        'en_cours_marche',
  en_cours_marche: 'en_livraison',
  en_livraison:    'livree',
}

const NEXT_LABEL = {
  assignee:        '🛒 Je suis au marché',
  en_cours_marche: '🛵 Je suis en route',
  en_livraison:    '✅ Livraison effectuée',
}

export function LiveurDashboard() {
  const { user, isAuth } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil]         = useState(null)
  const [disponibles, setDisponibles] = useState([])
  const [enCours, setEnCours]       = useState([])
  const [historique, setHistorique] = useState([])
  const [tab, setTab]               = useState('encours')

  useEffect(() => {
    if (!isAuth || user?.role !== 'livreur') { navigate('/'); return }
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [isAuth])

  const loadData = async () => {
    try {
      const [p, d, ec, h] = await Promise.all([
        api.get('/livreur/profil'),
        api.get('/commandes/livreur/disponibles'),
        api.get('/commandes/livreur/en-cours'),
        api.get('/livreur/historique'),
      ])
      setProfil(p.data); setDisponibles(d.data); setEnCours(ec.data); setHistorique(h.data)
      if (ec.data?.length > 0) setTab('encours')
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
      toast.success('Commande acceptée ! Contactez le client si besoin.')
      loadData()
      setTab('encours')
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const changerStatut = async (id, statut) => {
    try {
      await api.post(`/commandes/${id}/statut`, { statut })
      const msgs = { en_cours_marche: 'Vous êtes au marché 🛒', en_livraison: 'En route vers le client 🛵', livree: 'Livraison confirmée ✅' }
      toast.success(msgs[statut] || 'Statut mis à jour')
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
          {[
            ['encours', `En cours${enCours.length > 0 ? ` (${enCours.length})` : ''}`],
            ['dispo',   `Disponibles${disponibles.length > 0 ? ` (${disponibles.length})` : ''}`],
            ['histo',   'Historique'],
          ].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── ONGLET EN COURS ── */}
        {tab === 'encours' && (
          <div className="space-y-4">
            {enCours.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Clock size={40} className="mx-auto mb-4 opacity-30"/>
                <p className="font-semibold">Aucune livraison en cours</p>
                <p className="text-sm mt-1">Acceptez une commande dans l'onglet "Disponibles"</p>
              </div>
            ) : enCours.map(c => {
              const info = STATUT_LABELS[c.statut] || {}
              const nextStatut = NEXT_STATUT[c.statut]
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  {/* En-tête */}
                  <div className="bg-gradient-to-r from-navy to-blue-900 px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{c.numero}</p>
                      <p className="text-white/50 text-xs">{c.creneau?.replace(/_/g,' ')}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${info.color}`}>
                      {info.emoji} {info.label}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Contact client */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <User size={12}/> Contact client
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{c.client_nom || 'Client'}</p>
                          {c.client_telephone && (
                            <p className="text-gray-500 text-xs font-mono mt-0.5">{c.client_telephone}</p>
                          )}
                          {(c.adresse_quartier || c.adresse_ville) && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={10} className="text-gray-400 shrink-0"/>
                              <p className="text-gray-400 text-xs truncate">
                                {[c.adresse_quartier, c.adresse_ville].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {c.client_telephone ? (
                            <a href={`tel:${c.client_telephone}`}
                              className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
                              <Phone size={16}/>
                            </a>
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                              <Phone size={16}/>
                            </div>
                          )}
                          <a href={c.client_telephone ? `sms:${c.client_telephone}` : '#'}
                            className="w-10 h-10 bg-navy hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
                            <MessageCircle size={16}/>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Montant */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Montant commande</span>
                      <span className="font-bold text-navy text-base">{c.total_fcfa?.toLocaleString()} F</span>
                    </div>

                    {/* Bouton action suivante */}
                    {nextStatut && (
                      <button
                        onClick={() => changerStatut(c.id, nextStatut)}
                        className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors shadow-sm">
                        {NEXT_LABEL[c.statut]}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ONGLET DISPONIBLES ── */}
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
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-navy">{c.numero}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{c.creneau?.replace(/_/g,' ')}</p>
                    </div>
                    <p className="font-bold text-amber-500 text-lg">{c.total_fcfa?.toLocaleString()} F</p>
                  </div>
                  {(c.adresse_quartier || c.adresse_ville) && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPin size={12} className="shrink-0"/>
                      <p className="text-xs">{[c.adresse_quartier, c.adresse_ville].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <button onClick={() => accepter(c.id)} className="btn-primary w-full text-sm py-2.5">
                    ✅ Accepter cette commande
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET HISTORIQUE ── */}
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
                  <p className="font-bold text-amber-500">{c.total_fcfa?.toLocaleString()} F</p>
                  <span className="text-xs text-green-600 font-semibold">✅ Livrée</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
