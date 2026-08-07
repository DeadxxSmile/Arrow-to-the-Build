import { useEffect, useState } from 'react'

export default function CachedImage({ src, alt = '', className = '', fallback = 'initial' }) {
  const [resolved, setResolved] = useState(null)
  useEffect(() => {
    let live = true
    setResolved(null)
    if (!src) return
    window.api.images.resolve(src).then(v => { if (live) setResolved(v) }).catch(() => { })
    return () => { live = false }
  }, [src])
  if (!resolved) {
    // With no source at all, a letter placeholder is just noise, so render nothing when asked.
    if (!src && fallback === 'none') return null
    return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}>{alt?.slice(0, 1) || '?'}</div>
  }
  return <img src={resolved} alt={alt} className={className} />
}
