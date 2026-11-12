import { useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Hook de confirmation pour les opérations critiques.
 *
 *   const { confirm, ConfirmDialog } = useConfirm()
 *   if (await confirm({ titre:'Annuler ?', message:'...', danger:true, confirmLabel:'Oui, annuler' })) {
 *     // action confirmée
 *   }
 *   return <div>... {ConfirmDialog}</div>
 */
export function useConfirm() {
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setState({ titre: 'Confirmer ?', message: '', confirmLabel: 'Confirmer', danger: false, ...opts })
  }), [])

  const close = (val) => { resolver.current?.(val); setState(null) }

  const ConfirmDialog = state ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => close(false)} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          state.danger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-[#0D2137] text-center">{state.titre}</h3>
        {state.message && <p className="text-sm text-gray-500 text-center mt-2">{state.message}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={() => close(false)}
            className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={() => close(true)}
            className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors ${
              state.danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#0D2137] text-white hover:bg-amber-400 hover:text-gray-900'}`}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialog }
}
