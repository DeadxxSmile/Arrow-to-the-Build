import { useApp } from '../App'

export default function EmptyState() {
  const { openCharacterModal, loading } = useApp()
  if (loading) return <div className="empty-state"><h1>Loading…</h1><p>Reading your local ATTB database.</p></div>
  return <div className="empty-state">
    <img src="./logo-words.png" alt="Arrow to the Build" />
    <h1>Build toward something</h1>
    <p>Add a character from one of the bundled or imported human-readable JSON build files.</p>
    <button className="btn primary" onClick={openCharacterModal}>Add your first character</button>
  </div>
}
