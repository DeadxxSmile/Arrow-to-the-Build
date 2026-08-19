'use strict'

const fs = require('fs')
const path = require('path')
const { dialog, shell } = require('electron')
const themeService = require('../themeService')

function safeName(value) {
  return String(value || 'ATTB-theme').replace(/[<>:"/\\|?*]+/g, '-').trim() || 'ATTB-theme'
}

function register(ipcMain) {
  ipcMain.handle('themes:list', () => themeService.loadRegistry())
  ipcMain.handle('themes:save', (_event, definition, originalId = null) => themeService.writeTheme(definition, originalId))
  ipcMain.handle('themes:delete', (_event, id) => themeService.deleteTheme(id))
  ipcMain.handle('themes:openFolder', async () => {
    const directory = themeService.ensureThemesDirectory()
    const error = await shell.openPath(directory)
    if (error) throw new Error(error)
    return directory
  })
  ipcMain.handle('themes:import', async (_event, overwrite = false) => {
    const result = await dialog.showOpenDialog({ title: 'Import ATTB Theme', properties: ['openFile'], filters: [{ name: 'ATTB Theme JSON', extensions: ['json'] }] })
    if (result.canceled || !result.filePaths[0]) return null
    const raw = themeService.readJsonFile(result.filePaths[0])
    const checked = themeService.cleanDefinition(raw)
    if (checked.errors.length) throw new Error(checked.errors.join('\n'))
    const registry = themeService.loadRegistry()
    const existing = registry.themes.find(theme => theme.id === checked.theme.id)
    if (existing?.built_in) throw new Error(`Theme ID "${checked.theme.id}" belongs to a protected built-in theme. Change the ID in the JSON before importing.`)
    if (existing && !overwrite) return { conflict: true, existing, incoming: checked.theme, incoming_raw: raw }
    return { conflict: false, ...themeService.writeTheme(raw, existing ? existing.id : null) }
  })
  ipcMain.handle('themes:export', async (_event, id) => {
    const raw = themeService.getRawDefinition(id)
    const result = await dialog.showSaveDialog({ title: 'Export ATTB Theme', defaultPath: `${safeName(raw.name)}.json`, filters: [{ name: 'ATTB Theme JSON', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
    return result.filePath
  })
  ipcMain.handle('themes:exportTemplate', async () => {
    const result = await dialog.showSaveDialog({ title: 'Save ATTB Theme Template', defaultPath: 'ATTB_THEME_TEMPLATE.json', filters: [{ name: 'ATTB Theme JSON', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return null
    fs.copyFileSync(themeService.templatePath(), result.filePath)
    return result.filePath
  })
}

module.exports = { register }
