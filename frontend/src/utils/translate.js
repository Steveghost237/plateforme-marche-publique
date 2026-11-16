// Pilote le widget Google Translate chargé dans index.html via le cookie `googtrans`.
// Le cookie est relu à chaque chargement → on change la langue puis on recharge la page.
export function applyGoogleLang(code) {
  const expire = 'Thu, 01 Jan 1970 00:00:01 GMT'
  const host = location.hostname
  if (code === 'fr') {
    // Retour au français : suppression du cookie
    document.cookie = `googtrans=;path=/;expires=${expire}`
    document.cookie = `googtrans=;path=/;domain=.${host};expires=${expire}`
  } else {
    const val = `/fr/${code}`
    document.cookie = `googtrans=${val};path=/`
    document.cookie = `googtrans=${val};path=/;domain=.${host}`
  }
  window.location.reload()
}

// Lit la langue Google active au chargement (utile après reload)
export function googleLangActive() {
  const m = document.cookie.match(/googtrans=\/fr\/(\w+)/)
  return m && m[1] !== 'fr' ? m[1] : 'fr'
}
