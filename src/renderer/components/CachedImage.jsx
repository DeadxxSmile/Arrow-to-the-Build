import React, { useEffect, useState } from 'react'

export default function CachedImage({ src, alt = '', className = '' }) {
  const [resolved, setResolved] = useState(null)
  useEffect(() => {
    let live = true
    setResolved(null)
    if (!src) return
    window.api.images.resolve(src).then(v => { if (live) setResolved(v) }).catch(() => { })
    return () => { live = false }
  }, [src])
  if (!resolved) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}>{alt?.slice(0, 1) || '?'}</div>
  return <img src={resolved} alt={alt} className={className} />
}
