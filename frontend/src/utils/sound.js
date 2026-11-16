// Petit son de notification (2 notes) généré via Web Audio API — aucun asset requis.
// Le contexte ne peut démarrer qu'après une interaction utilisateur (politique navigateur) ;
// on le déverrouille au premier clic/toucher.

let ctx = null
let unlocked = false

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Déverrouille l'audio dès la première interaction (required by autoplay policy)
if (typeof window !== 'undefined') {
  const unlock = () => { unlocked = true; getCtx(); window.removeEventListener('pointerdown', unlock) }
  window.addEventListener('pointerdown', unlock)
}

export function playNotifSound() {
  const c = getCtx()
  if (!c || c.state === 'suspended') return  // pas encore d'interaction utilisateur
  try {
    const t0 = c.currentTime
    ;[[880, 0], [1174.66, 0.15]].forEach(([freq, delay]) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t0 + delay)
      gain.gain.linearRampToValueAtTime(0.18, t0 + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.35)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(t0 + delay)
      osc.stop(t0 + delay + 0.4)
    })
  } catch {}
}
