import { useState } from 'react'
import { Plus, X, Pencil, Check } from 'lucide-react'

const VIDELIGNE = { nom:'', unite:'g', quantite_defaut:100, quantite_min:0, quantite_max:'',
                    prix_defaut_fcfa:0, prix_min_fcfa:0, prix_max_fcfa:'', est_obligatoire:false }
const UNITES = [ ['g','grammes (g)'], ['cl','centilitres (cl)'], ['pcs','pièces (pcs)'], ['unite','unité'] ]

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n }

// ── Éditeur de lignes d'ingrédients — même structure que la création produit admin
//    (AdminPrix). Utilisé par la suggestion client et la validation admin. ────────
export default function IngredientEditor({ value = [], onChange }) {
  const [form, setForm] = useState({ ...VIDELIGNE })
  const [editIdx, setEditIdx] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const ajouter = () => {
    if (!form.nom.trim()) return
    const ing = {
      ...form,
      nom: form.nom.trim(),
      quantite_defaut: toNum(form.quantite_defaut) ?? 1,
      quantite_min: toNum(form.quantite_min) ?? 0,
      quantite_max: toNum(form.quantite_max),
      prix_defaut_fcfa: parseInt(form.prix_defaut_fcfa) || 0,
      prix_min_fcfa: parseInt(form.prix_min_fcfa) || 0,
      prix_max_fcfa: form.prix_max_fcfa === '' || form.prix_max_fcfa == null ? null : parseInt(form.prix_max_fcfa),
    }
    if (editIdx != null) { onChange(value.map((l, i) => i === editIdx ? ing : l)); setEditIdx(null) }
    else                 { onChange([...value, ing]) }
    setForm({ ...VIDELIGNE })
  }
  const editer = (i) => { setForm({ ...VIDELIGNE, ...value[i] }); setEditIdx(i) }
  const retirer = (i) => { onChange(value.filter((_, j) => j !== i)); if (editIdx === i) { setEditIdx(null); setForm({ ...VIDELIGNE }) } }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((ing, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${editIdx === i ? 'bg-purple-100' : 'bg-purple-50'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0D2137] truncate">
                  {ing.nom}{ing.est_obligatoire && <span className="text-red-400">*</span>}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {ing.quantite_min ?? 0}–{ing.quantite_max ?? '∞'}{ing.unite} · défaut {ing.quantite_defaut ?? 1}{ing.unite}
                  {' · '}{ing.prix_min_fcfa ?? 0}–{ing.prix_max_fcfa ?? '∞'} F · défaut {ing.prix_defaut_fcfa ?? 0} F
                </p>
              </div>
              <button type="button" onClick={() => editer(i)} className="p-1 text-purple-400 hover:text-purple-600"><Pencil size={12}/></button>
              <button type="button" onClick={() => retirer(i)} className="p-1 text-red-300 hover:text-red-500"><X size={13}/></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-2 border-dashed border-purple-200 rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <input className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400"
            placeholder="Nom de l'ingrédient *" value={form.nom} onChange={e => set('nom', e.target.value)}/>
          <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
            value={form.unite} onChange={e => set('unite', e.target.value)}>
            {UNITES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
          <div>Qté défaut<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.quantite_defaut} onChange={e => set('quantite_defaut', e.target.value)}/></div>
          <div>Qté min<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.quantite_min} onChange={e => set('quantite_min', e.target.value)}/></div>
          <div>Qté max<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.quantite_max ?? ''} onChange={e => set('quantite_max', e.target.value)}/></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-bold">
          <div>Prix défaut F<input type="number" className="w-full border border-amber-300 bg-amber-50 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.prix_defaut_fcfa} onChange={e => set('prix_defaut_fcfa', e.target.value)}/></div>
          <div>Prix min F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.prix_min_fcfa} onChange={e => set('prix_min_fcfa', e.target.value)}/></div>
          <div>Prix max F<input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
            value={form.prix_max_fcfa ?? ''} onChange={e => set('prix_max_fcfa', e.target.value)}/></div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600"
              checked={!!form.est_obligatoire} onChange={e => set('est_obligatoire', e.target.checked)}/>
            Obligatoire
          </label>
          <button type="button" onClick={ajouter} disabled={!form.nom.trim()}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40">
            {editIdx != null ? <><Check size={11}/> Modifier</> : <><Plus size={11}/> Ajouter</>}
          </button>
        </div>
      </div>
    </div>
  )
}
