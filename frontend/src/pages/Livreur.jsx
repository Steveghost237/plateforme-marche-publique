import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, Package, Star, Clock, ToggleLeft, ToggleRight, Phone, MessageCircle, User, LogOut, ArrowLeft, Search, Settings, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useConfirm } from '../components/common/useConfirm'
import ChangerMotDePasse from '../components/common/ChangerMotDePasse'
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
  const { user, isAuth, logout } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil]         = useState(null)
  const [disponibles, setDisponibles] = useState([])
  const [enCours, setEnCours]       = useState([])
  const [historique, setHistorique] = useState([])
  const [detail, setDetail]         = useState(null)
  const [tab, setTab]               = useState('encours')
  const [search, setSearch]         = useState('')
  const [periode, setPeriode]       = useState('tout')   // tout | 7j | 30j
  const [filtreVille, setFiltreVille]   = useState('')
  const [filtreMarche, setFiltreMarche] = useState('')
  const [filtreAgent, setFiltreAgent]   = useState('')
  const [tri, setTri]                   = useState('recent') // recent | proche | montant
  const [showProfil, setShowProfil] = useState(false)
  const [profilForm, setProfilForm] = useState(null)
  const [savingProfil, setSavingProfil] = useState(false)

  useEffect(() => {
    if (!isAuth || user?.role !== 'livreur') { navigate('/'); return }
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [isAuth])

  // Position GPS du livreur → distances marchés (« commandes les plus proches »)
  useEffect(() => {
    if (!isAuth || user?.role !== 'livreur' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => api.put('/livreur/localisation', { latitude: pos.coords.latitude, longitude: pos.coords.longitude })
               .then(loadData).catch(() => {}),
      () => {}, { timeout: 8000 })
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

  const accepter = async (c) => {
    const ok = await confirm({
      titre: 'Accepter cette commande ?',
      message: `${c.numero} — ${c.client_nom || 'Client'} · ${(c.total_fcfa || 0).toLocaleString()} F${c.adresse_quartier ? ` · ${[c.adresse_quartier, c.adresse_ville].filter(Boolean).join(', ')}` : ''}`,
      confirmLabel: 'Accepter la course'
    })
    if (!ok) return
    try {
      await api.post(`/commandes/${c.id}/accepter`)
      toast.success('Commande acceptée ! Contactez le client si besoin.')
      loadData()
      setTab('encours')
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const { confirm, ConfirmDialog } = useConfirm()

  const changerStatut = async (id, statut) => {
    if (statut === 'livree' && !await confirm({ titre: 'Confirmer la livraison ?', message: 'Le client sera notifié que sa commande a été livrée.', confirmLabel: 'Confirmer la livraison' })) return
    try {
      await api.post(`/commandes/${id}/statut`, { statut })
      const msgs = { en_cours_marche: 'Vous êtes au marché 🛒', en_livraison: 'En route vers le client 🛵', livree: 'Livraison confirmée ✅' }
      toast.success(msgs[statut] || 'Statut mis à jour')
      loadData()
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const NIVEAU_INFO = { debutant:{ label:'Débutant', emoji:'⚪' }, junior:{ label:'Junior', emoji:'🟢' }, senior:{ label:'Senior', emoji:'🔵' }, expert:{ label:'Expert', emoji:'🟡' }, elite:{ label:'Élite', emoji:'🔴' } }

  const ouvrirProfil = async () => {
    try {
      const { data } = await api.get('/livreur/profil/detail')
      setProfilForm({ nom_complet: data.nom_complet || '', telephone_secondaire: data.telephone_secondaire || '',
                      type_vehicule: data.type_vehicule || 'moto', plaque: data.plaque || '', zone_couverte: data.zone_couverte || '',
                      telephone: data.telephone, email: data.email })
      setShowProfil(true)
    } catch { toast.error('Impossible de charger le profil') }
  }

  const sauverProfil = async () => {
    setSavingProfil(true)
    try {
      await Promise.all([
        api.put('/livreur/profil', { type_vehicule: profilForm.type_vehicule, plaque: profilForm.plaque, zone_couverte: profilForm.zone_couverte }),
        api.put('/auth/me', { nom_complet: profilForm.nom_complet, email: profilForm.email || null, telephone_secondaire: profilForm.telephone_secondaire || null }),
      ])
      toast.success('Profil mis à jour')
      setShowProfil(false)
    } catch(err) { toast.error(err.response?.data?.detail || 'Erreur') }
    finally { setSavingProfil(false) }
  }

  const seDeconnecter = async () => {
    if (!await confirm({ titre: 'Se déconnecter ?', message: 'Vous devrez vous reconnecter pour reprendre des courses.', confirmLabel: 'Déconnexion', danger: true })) return
    logout(); navigate('/connexion')
  }

  // ── Recherche & filtres ──
  const matchSearch = (c, fields) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return fields.some(f => (f || '').toLowerCase().includes(q))
  }
  // Options de filtres construites depuis les commandes dispo
  const villesDispo  = [...new Set(disponibles.map(c => c.adresse_ville).filter(Boolean))]
  const marchesDispo = [...new Map(disponibles.filter(c => c.point_achat_id).map(c => [c.point_achat_id, c.point_achat_nom])).entries()]
  const agentsDispo  = [...new Set(disponibles.map(c => c.agent_nom).filter(Boolean))]

  const dispoFiltrees = disponibles
    .filter(c => matchSearch(c, [c.numero, c.client_nom, c.adresse_quartier, c.adresse_ville, c.point_achat_nom, c.agent_nom]))
    .filter(c => !filtreVille  || c.adresse_ville === filtreVille)
    .filter(c => !filtreMarche || c.point_achat_id === filtreMarche)
    .filter(c => !filtreAgent  || c.agent_nom === filtreAgent)
    .sort((a, b) => {
      if (tri === 'proche')  return (a.distance_km ?? 99999) - (b.distance_km ?? 99999)
      if (tri === 'montant') return (b.total_fcfa || 0) - (a.total_fcfa || 0)
      return 0 // ordre serveur : prêtes en premier puis chronologique
    })
  const histoFiltrees   = historique.filter(c => {
    if (!matchSearch(c, [c.numero, c.client_nom, c.adresse_quartier, c.adresse_ville])) return false
    if (periode === 'tout' || !c.livree_at) return periode === 'tout' ? true : false
    const jours = periode === '7j' ? 7 : 30
    return (Date.now() - new Date(c.livree_at)) <= jours * 86400000
  })
  const gainsFiltres = histoFiltrees.reduce((a, c) => a + (c.gain_fcfa || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {ConfirmDialog}
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <button onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-2 transition-colors">
                <ArrowLeft size={14}/> Retour à la boutique
              </button>
              <h1 className="font-serif text-white text-2xl">Espace Livreur</h1>
              <p className="text-white/60 text-sm">Bonjour, {user?.nom_complet?.split(' ')[0]} 👋</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {profil && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${profil.statut === 'disponible' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}
                  onClick={toggleDispo}>
                  {profil.statut === 'disponible' ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                  <span className="text-sm font-semibold">{profil.statut === 'disponible' ? 'Disponible' : 'Hors ligne'}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={ouvrirProfil} title="Mon profil"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <Settings size={15}/>
                </button>
                <button onClick={seDeconnecter} title="Se déconnecter"
                  className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-300 hover:text-red-200 transition-colors">
                  <LogOut size={15}/>
                </button>
              </div>
            </div>
          </div>

          {profil && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { val: profil.note_moyenne?.toFixed(1) || '0.0', label:'Note ⭐' },
                { val: profil.total_livraisons || 0, label:'Livraisons' },
                { val: `${(profil.total_gains_fcfa || 0).toLocaleString()} F`, label:'Gains totaux' },
                { val: (NIVEAU_INFO[profil.niveau] || NIVEAU_INFO.debutant).emoji + ' ' + (NIVEAU_INFO[profil.niveau]?.label || profil.niveau), label:'Niveau' },
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

        {/* Recherche */}
        {(tab === 'dispo' && disponibles.length > 0) || (tab === 'histo' && historique.length > 0) ? (
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'histo' ? 'Rechercher (n°, client, quartier…)' : 'Rechercher une commande…'}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
          </div>
        ) : null}

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
                          {c.client_telephone2 && (
                            <p className="text-gray-500 text-xs font-mono mt-0.5">
                              <span className="text-amber-600 font-semibold">secours : </span>{c.client_telephone2}
                            </p>
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

                    {/* Retrait au marché + agent préparateur */}
                    {c.point_achat_nom && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
                        <Store size={14} className="text-emerald-600 shrink-0"/>
                        <div className="text-xs">
                          <p className="font-bold text-emerald-700">Retrait : {c.point_achat_nom}{c.point_achat_quartier ? ` · ${c.point_achat_quartier}` : ''}</p>
                          {c.agent_nom && <p className="text-emerald-600 mt-0.5">Agent : {c.agent_nom}</p>}
                        </div>
                      </div>
                    )}

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
            {/* Filtres : ville livraison, point d'achat, agent + tri */}
            {disponibles.length > 0 && (
              <div className="bg-white rounded-xl p-3 shadow-sm grid grid-cols-2 gap-2">
                <select value={filtreVille} onChange={e => setFiltreVille(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300">
                  <option value="">🏠 Toutes villes</option>
                  {villesDispo.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={filtreMarche} onChange={e => setFiltreMarche(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300">
                  <option value="">🏪 Tous marchés</option>
                  {marchesDispo.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
                </select>
                <select value={filtreAgent} onChange={e => setFiltreAgent(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300">
                  <option value="">👤 Tous agents</option>
                  {agentsDispo.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={tri} onChange={e => setTri(e.target.value)}
                  className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300">
                  <option value="recent">🕐 Prêtes d'abord</option>
                  <option value="proche">📍 Plus proches</option>
                  <option value="montant">💰 Montant décroissant</option>
                </select>
              </div>
            )}
            {disponibles.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Package size={40} className="mx-auto mb-4 opacity-30"/>
                <p>Aucune commande disponible</p>
                <p className="text-sm mt-1">Passez en mode disponible pour recevoir des commandes</p>
              </div>
            ) : dispoFiltrees.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Search size={32} className="mx-auto mb-3 opacity-30"/>
                <p>Aucune commande ne correspond à « {search} »</p>
              </div>
            ) : dispoFiltrees.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${c.prete ? 'ring-2 ring-emerald-300' : ''}`}>
                {c.prete && (
                  <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
                    🛍️ Commande PRÊTE — à récupérer{c.point_achat_nom ? ` au ${c.point_achat_nom}` : ''}
                  </div>
                )}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-navy">{c.numero}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{c.creneau?.replace(/_/g,' ')}{c.nb_lignes ? ` · ${c.nb_lignes} article${c.nb_lignes > 1 ? 's' : ''}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-500 text-lg">{c.total_fcfa?.toLocaleString()} F</p>
                      {c.distance_km != null && (
                        <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">📍 {c.distance_km} km</p>
                      )}
                    </div>
                  </div>
                  {c.point_achat_nom && (
                    <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                      <Store size={12} className="shrink-0"/>
                      <p className="text-xs font-semibold">Retrait : {c.point_achat_nom}{[c.point_achat_quartier, c.point_achat_ville].filter(Boolean).length ? ` (${[c.point_achat_quartier, c.point_achat_ville].filter(Boolean).join(', ')})` : ''}</p>
                    </div>
                  )}
                  {c.agent_nom && (
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <User size={12} className="shrink-0 text-gray-400"/>
                      <p className="text-xs">Agent : <span className="font-medium text-gray-600">{c.agent_nom}</span>{c.prete ? ' (commande préparée)' : ''}</p>
                    </div>
                  )}
                  {(c.adresse_quartier || c.adresse_ville) && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPin size={12} className="shrink-0"/>
                      <p className="text-xs">Livrer : {[c.adresse_quartier, c.adresse_ville].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <button onClick={() => accepter(c)} className="btn-primary w-full text-sm py-2.5">
                    {c.prete ? '🛍️ Récupérer au marché' : '✅ Accepter cette commande'}
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
            ) : (
              <>
                {/* Filtre période + récap gains */}
                <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex gap-1">
                    {[['tout','Tout'],['7j','7 jours'],['30j','30 jours']].map(([v,l]) => (
                      <button key={v} onClick={() => setPeriode(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${periode===v ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Gains · {histoFiltrees.length} course{histoFiltrees.length>1?'s':''}</p>
                    <p className="text-sm font-bold text-green-600">+{gainsFiltres.toLocaleString()} F</p>
                  </div>
                </div>
                {histoFiltrees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Search size={32} className="mx-auto mb-3 opacity-30"/>
                    <p>Aucun résultat pour cette recherche/période</p>
                  </div>
                ) : histoFiltrees.map(c => (
                  <button key={c.id} onClick={() => setDetail(c)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm flex justify-between items-center hover:ring-2 hover:ring-amber-300 transition-all text-left">
                    <div>
                      <p className="font-bold text-navy text-sm">{c.numero}</p>
                      <p className="text-gray-400 text-xs">{c.client_nom || '—'} · {c.livree_at ? new Date(c.livree_at).toLocaleDateString('fr-FR') : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-500">{c.total_fcfa?.toLocaleString()} F</p>
                      <span className="text-xs text-green-600 font-semibold">✅ Livrée · +{(c.gain_fcfa||0).toLocaleString()} F</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL DÉTAIL LIVRAISON ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)}/>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-navy px-5 py-4 sticky top-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{detail.numero}</p>
                  <p className="text-white/50 text-xs">Livrée le {detail.livree_at ? new Date(detail.livree_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '—'}</p>
                </div>
                <button onClick={() => setDetail(null)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Client */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Client</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  <p className="font-bold text-navy text-sm flex items-center gap-1.5"><User size={13}/> {detail.client_nom || '—'}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5"><Phone size={12}/> {detail.client_telephone || '—'}</p>
                  {detail.client_telephone2 && <p className="text-xs text-amber-700 flex items-center gap-1.5"><Phone size={12}/> secours : {detail.client_telephone2}</p>}
                  {(detail.adresse_quartier || detail.adresse_ville) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={12}/> {[detail.adresse_quartier, detail.adresse_ville].filter(Boolean).join(', ')}</p>
                  )}
                  {detail.creneau && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Clock size={12}/> {detail.creneau.replace(/_/g,' ')}{detail.date_livraison ? ` · ${new Date(detail.date_livraison).toLocaleDateString('fr-FR')}` : ''}</p>}
                </div>
              </div>
              {/* Produits */}
              {detail.lignes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Produits ({detail.lignes.length})</p>
                  <div className="space-y-1">
                    {detail.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span className="truncate flex-1">{l.nom} <span className="text-gray-400">×{l.quantite}</span></span>
                        <span className="font-semibold ml-2 shrink-0">{(l.prix_total || 0).toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Montants */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500"><span>Sous-total produits</span><span>{(detail.sous_total_fcfa || 0).toLocaleString()} F</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Frais de livraison</span><span>{(detail.frais_livraison || 0).toLocaleString()} F</span></div>
                <div className="flex justify-between font-bold text-navy text-sm pt-1 border-t border-gray-100"><span>Total encaissé</span><span className="text-amber-500">{(detail.total_fcfa || 0).toLocaleString()} F</span></div>
                <div className="flex justify-between text-xs text-green-600 font-semibold"><span>Votre gain</span><span>+{(detail.gain_fcfa || 0).toLocaleString()} F</span></div>
              </div>
              {/* Avis client */}
              {detail.note_client && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Avis du client</p>
                  <p className="text-sm">{'⭐'.repeat(detail.note_client)}</p>
                  {detail.avis_client && <p className="text-xs text-gray-600 mt-1 italic">« {detail.avis_client} »</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROFIL LIVREUR ── */}
      {showProfil && profilForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfil(false)}/>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-navy px-5 py-4 sticky top-0 flex justify-between items-center">
              <p className="font-bold text-white">Mon profil livreur</p>
              <button onClick={() => setShowProfil(false)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom complet</label>
                <input value={profilForm.nom_complet} onChange={e => setProfilForm({...profilForm, nom_complet: e.target.value})}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Téléphone principal</label>
                <p className="mt-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-500 font-mono">{profilForm.telephone} <span className="text-[10px] text-gray-400">(non modifiable)</span></p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse email</label>
                <input type="email" value={profilForm.email || ''} onChange={e => setProfilForm({...profilForm, email: e.target.value})}
                  placeholder="exemple@gmail.com"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
                <p className="text-[10px] text-gray-400 mt-1">Reçoit les notifications de missions et codes de réinitialisation</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Téléphone de secours</label>
                <input value={profilForm.telephone_secondaire} onChange={e => setProfilForm({...profilForm, telephone_secondaire: e.target.value})}
                  placeholder="+237 6 XX XX XX XX"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Véhicule</label>
                  <select value={profilForm.type_vehicule} onChange={e => setProfilForm({...profilForm, type_vehicule: e.target.value})}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option value="moto">🏍️ Moto</option>
                    <option value="velo">🚲 Vélo</option>
                    <option value="voiture">🚗 Voiture</option>
                    <option value="pied">🚶 À pied</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plaque</label>
                  <input value={profilForm.plaque} onChange={e => setProfilForm({...profilForm, plaque: e.target.value})}
                    placeholder="CE 123 AB"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone de couverture</label>
                <input value={profilForm.zone_couverte} onChange={e => setProfilForm({...profilForm, zone_couverte: e.target.value})}
                  placeholder="Ex : Yaoundé centre, Nkolbisson…"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"/>
                <p className="text-[10px] text-gray-400 mt-1">Quartiers/villes où vous pouvez livrer</p>
              </div>
              <button onClick={sauverProfil} disabled={savingProfil}
                className="btn-primary w-full py-3 text-sm disabled:opacity-50">
                {savingProfil ? 'Enregistrement…' : '💾 Enregistrer'}
              </button>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sécurité</p>
                <ChangerMotDePasse/>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
