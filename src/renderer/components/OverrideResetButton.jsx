import { useApp } from '../App'

export function overrideEntry(character, fieldPath) {
  return character?.addon_sync?.overrides?.find(item => item.path === fieldPath) || null
}

export default function OverrideResetButton({ fieldPath, label = 'Restore live ESO value', compact = false }) {
  const { character, clearAddonOverride } = useApp()
  if (!character?.addon_sync?.linked || !overrideEntry(character, fieldPath)) return null
  return <button type="button" className={`override-reset ${compact ? 'compact' : ''}`} onClick={() => clearAddonOverride(fieldPath)} title={label} aria-label={label}>↶</button>
}
