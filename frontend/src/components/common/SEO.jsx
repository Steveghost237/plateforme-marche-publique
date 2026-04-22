import { useEffect } from 'react'

export default function SEO({ title, description }) {
  useEffect(() => {
    const base = 'Marché·CM'
    document.title = title ? `${title} — ${base}` : `${base} — Livraison à domicile Cameroun`

    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content || '')
    }

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description)
    }
    if (title) {
      setMeta('og:title', `${title} — ${base}`)
    }
  }, [title, description])

  return null
}
