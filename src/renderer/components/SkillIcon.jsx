import { useEffect, useMemo, useState } from 'react'
import CachedImage from './CachedImage'
import { catalogSkillMap } from '../utils/catalogLogic'

function initials(value = '') {
  const words = String(value).replace(/[^a-z0-9 ]/gi, ' ').split(/\s+/).filter(Boolean)
  return (words.slice(0, 2).map(word => word[0]).join('') || '?').toUpperCase()
}

function generatedIconPath(skillId) {
  return skillId ? `./skill-icons/${encodeURIComponent(skillId)}.png` : null
}

export default function SkillIcon({ skillId, name, image, className = '', size = 'normal' }) {
  const skill = catalogSkillMap.get(skillId)?.skill
  const label = name || skill?.name || 'Unknown skill'
  const explicitSource = image || skill?.image || null
  const localSource = useMemo(() => generatedIconPath(skillId), [skillId])
  const [localFailed, setLocalFailed] = useState(false)

  useEffect(() => { setLocalFailed(false) }, [localSource])

  if (explicitSource) return <CachedImage src={explicitSource} alt={label} className={`hotbar-skill-image ${size} ${className}`} />
  if (localSource && !localFailed) {
    return <img src={localSource} alt={label} className={`hotbar-skill-image generated ${size} ${className}`} onError={() => setLocalFailed(true)} />
  }
  return <span className={`skill-icon-fallback ${size} ${className}`} title={label} aria-label={label}>{initials(label)}</span>
}
