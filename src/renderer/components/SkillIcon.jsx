import React from 'react'
import CachedImage from './CachedImage'
import { catalogSkillMap } from '../utils/catalogLogic'

function initials(value = '') {
  const words = String(value).replace(/[^a-z0-9 ]/gi, ' ').split(/\s+/).filter(Boolean)
  return (words.slice(0, 2).map(word => word[0]).join('') || '?').toUpperCase()
}

export default function SkillIcon({ skillId, name, image, className = '', size = 'normal' }) {
  const skill = catalogSkillMap.get(skillId)?.skill
  const label = name || skill?.name || 'Unknown skill'
  const source = image || skill?.image || null
  if (source) return <CachedImage src={source} alt={label} className={`hotbar-skill-image ${size} ${className}`} />
  return <span className={`skill-icon-fallback ${size} ${className}`} title={label} aria-label={label}>{initials(label)}</span>
}
