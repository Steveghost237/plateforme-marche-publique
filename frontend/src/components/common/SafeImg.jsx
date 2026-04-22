import { useState } from 'react'

export default function SafeImg({ src, alt, className, fallbackEmoji = '🍽️' }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`${className} bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center`}>
        <span className="text-4xl opacity-40">{fallbackEmoji}</span>
      </div>
    )
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" decoding="async" />
}
