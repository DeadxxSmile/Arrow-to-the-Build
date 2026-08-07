import { useCallback, useEffect, useRef, useState } from 'react'

const HISTORY_LIMIT = 60

export default function useBuildEditor({ appSettings, reloadBuilds }) {
  const [draft, setDraft] = useState(null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [autosaveStatus, setAutosaveStatus] = useState('idle')
  const [validation, setValidation] = useState(null)
  const [revisions, setRevisions] = useState([])
  const editVersion = useRef(0)
  const pendingAutosave = useRef(false)
  const restored = useRef(false)

  const adoptDraft = useCallback(async next => {
    setDraft(next)
    setHistory([])
    setFuture([])
    setValidation(null)
    pendingAutosave.current = false
    setAutosaveStatus('idle')
    editVersion.current += 1
    if (next?.id) localStorage.setItem('attb-active-build-draft', next.id)
    else localStorage.removeItem('attb-active-build-draft')
    if (next?.build_id) setRevisions(await window.api.builds.listRevisions(next.build_id))
    else setRevisions([])
    return next
  }, [])

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const id = localStorage.getItem('attb-active-build-draft')
    if (!id) return
    window.api.builds.getDraft(id).then(found => {
      if (found) adoptDraft(found)
      else localStorage.removeItem('attb-active-build-draft')
    }).catch(() => localStorage.removeItem('attb-active-build-draft'))
  }, [adoptDraft])

  const flushCurrentDraft = useCallback(async () => {
    if (!draft || !pendingAutosave.current) return draft
    setAutosaveStatus('saving')
    const saved = await window.api.builds.saveDraft(draft.id, draft.data)
    pendingAutosave.current = false
    setDraft(current => current?.id === saved.id ? { ...current, updated_at: saved.updated_at, dirty: saved.dirty } : current)
    setAutosaveStatus('saved')
    return saved
  }, [draft])

  const openDraft = useCallback(async buildId => {
    await flushCurrentDraft()
    return adoptDraft(await window.api.builds.openDraft(buildId))
  }, [adoptDraft, flushCurrentDraft])
  const createBlankDraft = useCallback(async () => {
    await flushCurrentDraft()
    const author = appSettings.build_editor_default_author || 'NPC'
    const next = await adoptDraft(await window.api.builds.createBlankDraft(author))
    await reloadBuilds()
    return next
  }, [adoptDraft, appSettings.build_editor_default_author, flushCurrentDraft, reloadBuilds])
  const createGuidedDraft = useCallback(async options => {
    await flushCurrentDraft()
    const author = appSettings.build_editor_default_author || 'NPC'
    const next = await adoptDraft(await window.api.builds.createGuidedDraft(options, author))
    await reloadBuilds()
    return next
  }, [adoptDraft, appSettings.build_editor_default_author, flushCurrentDraft, reloadBuilds])
  const forkBuild = useCallback(async (buildId, name) => {
    await flushCurrentDraft()
    const author = appSettings.build_editor_default_author || 'NPC'
    const next = await adoptDraft(await window.api.builds.fork(buildId, name, author))
    await reloadBuilds()
    return next
  }, [adoptDraft, appSettings.build_editor_default_author, flushCurrentDraft, reloadBuilds])
  const createFromCharacter = useCallback(async (characterId, options = {}) => {
    await flushCurrentDraft()
    const author = appSettings.build_editor_default_author || 'NPC'
    const next = await adoptDraft(await window.api.builds.createFromCharacter(characterId, author, options))
    await reloadBuilds()
    return next
  }, [adoptDraft, appSettings.build_editor_default_author, flushCurrentDraft, reloadBuilds])
  const adaptFromCharacter = useCallback(async (characterId, sourceId, name = '') => {
    await flushCurrentDraft()
    const author = appSettings.build_editor_default_author || 'NPC'
    const next = await adoptDraft(await window.api.builds.adaptFromCharacter(characterId, sourceId, name, author))
    await reloadBuilds()
    return next
  }, [adoptDraft, appSettings.build_editor_default_author, flushCurrentDraft, reloadBuilds])

  const updateDraft = useCallback(updater => {
    setDraft(current => {
      if (!current) return current
      const nextData = typeof updater === 'function' ? updater(current.data) : updater
      if (!nextData || nextData === current.data) return current
      setHistory(items => [...items.slice(-(HISTORY_LIMIT - 1)), current.data])
      setFuture([])
      setValidation(null)
      setAutosaveStatus('pending')
      pendingAutosave.current = true
      editVersion.current += 1
      return { ...current, data: nextData, dirty: true }
    })
  }, [])

  const patchDraft = useCallback(patch => updateDraft(data => ({ ...data, ...patch })), [updateDraft])

  const undo = useCallback(() => {
    setHistory(items => {
      if (!items.length) return items
      const previous = items[items.length - 1]
      setDraft(current => {
        if (!current) return current
        setFuture(next => [current.data, ...next].slice(0, HISTORY_LIMIT))
        setAutosaveStatus('pending')
        pendingAutosave.current = true
        editVersion.current += 1
        return { ...current, data: previous, dirty: true }
      })
      setValidation(null)
      return items.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture(items => {
      if (!items.length) return items
      const nextData = items[0]
      setDraft(current => {
        if (!current) return current
        setHistory(previous => [...previous.slice(-(HISTORY_LIMIT - 1)), current.data])
        setAutosaveStatus('pending')
        pendingAutosave.current = true
        editVersion.current += 1
        return { ...current, data: nextData, dirty: true }
      })
      setValidation(null)
      return items.slice(1)
    })
  }, [])

  const persistDraft = useCallback(async () => {
    if (!draft || !pendingAutosave.current) return draft
    const version = editVersion.current
    const data = draft.data
    setAutosaveStatus('saving')
    try {
      const saved = await window.api.builds.saveDraft(draft.id, data)
      if (editVersion.current === version) {
        pendingAutosave.current = false
        setDraft(current => current ? { ...current, updated_at: saved.updated_at, dirty: saved.dirty } : current)
        setAutosaveStatus('saved')
      }
      return saved
    } catch (error) {
      setAutosaveStatus('error')
      throw error
    }
  }, [draft])

  useEffect(() => {
    if (!draft || !pendingAutosave.current) return undefined
    const seconds = Math.max(2, Number(appSettings.build_editor_autosave_seconds) || 5)
    const timer = setTimeout(() => { persistDraft().catch(error => console.error('[Build draft autosave]', error)) }, seconds * 1000)
    return () => clearTimeout(timer)
  }, [draft?.data, appSettings.build_editor_autosave_seconds, persistDraft])

  const validateDraft = useCallback(async () => {
    if (!draft) return null
    const result = await window.api.builds.validateData(draft.data)
    setValidation(result)
    return result
  }, [draft])

  const saveBuild = useCallback(async note => {
    if (!draft) return null
    await flushCurrentDraft()
    const result = await window.api.builds.saveBuild(draft.id, note || '')
    pendingAutosave.current = false
    setDraft(result.draft)
    setValidation({ valid: true, errors: [], data: result.draft.data })
    setAutosaveStatus('saved')
    setRevisions(await window.api.builds.listRevisions(result.draft.build_id))
    await reloadBuilds()
    return result
  }, [draft, flushCurrentDraft, reloadBuilds])

  const resetDraft = useCallback(async () => {
    if (!draft) return null
    return adoptDraft(await window.api.builds.resetDraft(draft.id))
  }, [adoptDraft, draft])

  const restoreRevision = useCallback(async revisionNumber => {
    if (!draft) return null
    return adoptDraft(await window.api.builds.restoreRevision(draft.id, revisionNumber))
  }, [adoptDraft, draft])

  const closeDraft = useCallback(async () => {
    await flushCurrentDraft()
    await adoptDraft(null)
  }, [adoptDraft, flushCurrentDraft])

  const getRevision = useCallback(async revisionNumber => {
    if (!draft) return null
    return window.api.builds.getRevision(draft.build_id, revisionNumber)
  }, [draft])

  const refreshRevisions = useCallback(async () => {
    if (!draft) return []
    const list = await window.api.builds.listRevisions(draft.build_id)
    setRevisions(list)
    return list
  }, [draft])

  return {
    draft,
    history,
    future,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    autosaveStatus,
    validation,
    revisions,
    openDraft,
    createBlankDraft,
    createGuidedDraft,
    forkBuild,
    createFromCharacter,
    adaptFromCharacter,
    updateDraft,
    patchDraft,
    undo,
    redo,
    persistDraft,
    flushCurrentDraft,
    validateDraft,
    saveBuild,
    resetDraft,
    restoreRevision,
    closeDraft,
    refreshRevisions,
    getRevision
  }
}
