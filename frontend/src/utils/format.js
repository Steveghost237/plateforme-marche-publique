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
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500', text: 'text-red-500' }
  if (score <= 2) return { score, label: 'Moyen', color: 'bg-orange-400', text: 'text-orange-500' }
  if (score <= 3) return { score, label: 'Bon', color: 'bg-amber-400', text: 'text-amber-600' }
  return { score, label: 'Fort', color: 'bg-green-500', text: 'text-green-600' }
}
