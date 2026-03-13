import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingBag, Package, DollarSign, BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import api from '../utils/api'
import { AdminLayout } from './Admin'

const STATUT_COLORS = {
  livree: '#16a34a',
  payee: '#2563eb',
  assignee: '#6366f1',
  en_cours_marche: '#f97316',
  en_livraison: '#06b6d4',
  en_attente_paiement: '#eab308',
  annulee: '#dc2626',
  brouillon: '#9ca3af',
}

const STATUT_LABELS = {
  livree: 'Livrée',
  payee: 'Payée',
  assignee: 'Assignée',
  en_cours_marche: 'Au marché',
  en_livraison: 'En livraison',
  en_attente_paiement: 'En attente',
  annulee: 'Annulée',
  brouillon: 'Brouillon',
}

export default function AdminStats() {
  const [dashboard, setDashboard] = useState(null)
  const [topProduits, setTopProduits] = useState([])
  const [statsCommandes, setStatsCommandes] = useState([])
  const [revenus, setRevenus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/dashboard').then(r => setDashboard(r.data)).catch(() => {}),
      api.get('/admin/stats').then(r => setTopProduits(r.data)).catch(() => {}),
      api.get('/admin/stats/commandes').then(r => setStatsCommandes(r.data)).catch(() => {}),
      api.get('/admin/stats/revenus').then(r => setRevenus(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Calculs
  const totalCommandes = statsCommandes.reduce((a, s) => a + (s.count || 0), 0)
  const totalCA = statsCommandes.reduce((a, s) => a + (s.total || 0), 0)
  const maxProduit = topProduits.length > 0 ? Math.max(...topProduits.map(p => p.nb_commandes || 0)) : 1
  const maxRevenu = revenus.length > 0 ? Math.max(...revenus.map(r => r.ca || 0)) : 1

  return (
    <AdminLayout title="Statistiques">
      {loading && <div className="text-center py-20 text-gray-400">Chargement des statistiques...</div>}

      {!loading && <>
        {/* KPIs principaux */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Commandes aujourd'hui", val: dashboard?.commandes_aujourd_hui ?? 0, icon: <ShoppingBag size={20} />, color: 'bg-blue-50 text-blue-600' },
            { label: "CA aujourd'hui", val: `${(dashboard?.ca_aujourd_hui ?? 0).toLocaleString()} F`, icon: <DollarSign size={20} />, color: 'bg-green-50 text-green-600' },
            { label: 'CA du mois', val: `${(dashboard?.ca_mois ?? 0).toLocaleString()} F`, icon: <TrendingUp size={20} />, color: 'bg-amber-50 text-amber-600' },
            { label: 'Total commandes', val: totalCommandes, icon: <Package size={20} />, color: 'bg-navy/10 text-navy' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>{k.icon}</div>
              <div className="font-bold text-navy text-2xl">{k.val}</div>
              <div className="text-gray-400 text-xs mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ── Répartition par statut ─────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <PieChart size={18} className="text-navy" />
              <h2 className="font-serif text-navy text-lg">Répartition par statut</h2>
            </div>
            {statsCommandes.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Aucune donnée</div>
            ) : (
              <div className="space-y-3">
                {statsCommandes.map(s => {
                  const pct = totalCommandes > 0 ? ((s.count / totalCommandes) * 100).toFixed(1) : 0
                  return (
                    <div key={s.statut}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUT_COLORS[s.statut] || '#9ca3af' }} />
                          <span className="text-sm font-medium text-gray-700">{STATUT_LABELS[s.statut] || s.statut}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{pct}%</span>
                          <span className="text-sm font-bold text-navy">{s.count}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: STATUT_COLORS[s.statut] || '#9ca3af' }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between">
                  <span className="text-sm text-gray-500 font-medium">CA total</span>
                  <span className="text-sm font-bold text-amber-600">{totalCA.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Top 10 Produits ─────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={18} className="text-navy" />
              <h2 className="font-serif text-navy text-lg">Top 10 Produits</h2>
            </div>
            {topProduits.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Aucune donnée</div>
            ) : (
              <div className="space-y-3">
                {topProduits.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{p.nom}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{(p.ca || 0).toLocaleString()} F</span>
                        <span className="text-sm font-bold text-navy">{p.nb_commandes}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${(p.nb_commandes / maxProduit) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Revenus mensuels ────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={18} className="text-navy" />
            <h2 className="font-serif text-navy text-lg">Revenus mensuels</h2>
          </div>
          {revenus.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Aucune donnée de revenus</div>
          ) : (
            <>
              {/* Barres de revenus */}
              <div className="flex items-end gap-2 h-48 mb-4">
                {[...revenus].reverse().map((r, i) => {
                  const pct = maxRevenu > 0 ? (r.ca / maxRevenu) * 100 : 0
                  return (
                    <div key={r.mois} className="flex-1 flex flex-col items-center gap-1 group" title={`${r.mois}: ${r.ca.toLocaleString()} FCFA`}>
                      <div className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.ca?.toLocaleString()} F
                      </div>
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500 min-h-[4px]"
                        style={{ height: `${Math.max(pct, 3)}%` }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                {[...revenus].reverse().map(r => (
                  <div key={r.mois} className="flex-1 text-center">
                    <div className="text-[10px] text-gray-400 font-medium">{r.mois?.slice(5)}/{r.mois?.slice(2, 4)}</div>
                  </div>
                ))}
              </div>

              {/* Tableau récapitulatif */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {['Mois', 'Commandes', 'Chiffre d\'affaires'].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {revenus.map(r => (
                      <tr key={r.mois} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-navy">{r.mois}</td>
                        <td className="px-4 py-2 text-gray-600">{r.nb_commandes}</td>
                        <td className="px-4 py-2 font-semibold text-amber-600">{(r.ca || 0).toLocaleString()} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </>}
    </AdminLayout>
  )
}
