const fcfaFormatter = new Intl.NumberFormat('fr-CM', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPrix(amount) {
  if (amount == null || isNaN(amount)) return '0 FCFA'
  return `${fcfaFormatter.format(amount)} FCFA`
}

export function formatPrixShort(amount) {
  if (amount == null || isNaN(amount)) return '0 F'
  return `${fcfaFormatter.format(amount)} F`
}

export function isValidCameroonPhone(phone) {
  const cleaned = phone.replace(/[\s\-().]/g, '')
  return /^(\+?237)?[6-9]\d{8}$/.test(cleaned)
}

export function normalizeCameroonPhone(phone) {
  let cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('00237')) cleaned = '+237' + cleaned.slice(5)
  if (cleaned.startsWith('237') && !cleaned.startsWith('+')) cleaned = '+' + cleaned
  if (/^[6-9]\d{8}$/.test(cleaned)) cleaned = '+237' + cleaned
  return cleaned
}

export function getPasswordStrength(password) {
  const p = password || ''
  const checks = [
    { key:'len8',     label:'8 caractères minimum',             ok: p.length >= 8 },
    { key:'maj',      label:'1 majuscule (A-Z)',                ok: /[A-Z]/.test(p) },
    { key:'min',      label:'1 minuscule (a-z)',                ok: /[a-z]/.test(p) },
    { key:'chiffre',  label:'1 chiffre (0-9)',                  ok: /[0-9]/.test(p) },
    { key:'special',  label:'1 caractère spécial (!@#…)',       ok: /[^A-Za-z0-9]/.test(p) },
    { key:'len12',    label:'12 caractères ou plus (excellent)',ok: p.length >= 12 },
  ]
  const requis = checks.slice(0, 5).every(c => c.ok)
  const score = checks.slice(0, 5).filter(c => c.ok).length + (requis && checks[5].ok ? 1 : 0)

  let out = { checks, score, ok: requis }
  if (!p) return { ...out, score: 0, label: '', color: '', text: '', niveau: 'faible' }
  if (requis && checks[5].ok) return { ...out, label: 'Excellent', color: 'bg-green-600', text: 'text-green-700', niveau: 'excellent' }
  if (requis) return { ...out, label: 'Fort', color: 'bg-green-500', text: 'text-green-600', niveau: 'fort' }
  if (score >= 3) return { ...out, label: 'Moyen', color: 'bg-amber-400', text: 'text-amber-600', niveau: 'moyen' }
  return { ...out, label: 'Faible', color: 'bg-red-500', text: 'text-red-500', niveau: 'faible' }
}
