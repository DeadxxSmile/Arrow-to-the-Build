'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: cb => ipcRenderer.on('window:maximized', (_e, v) => cb(v)),
    offMaximized: () => ipcRenderer.removeAllListeners('window:maximized')
  },
  builds: {
    list: () => ipcRenderer.invoke('builds:list'),
    get: id => ipcRenderer.invoke('builds:get', id),
    importFile: () => ipcRenderer.invoke('builds:import'),
    reloadForCharacter: id => ipcRenderer.invoke('builds:reloadForCharacter', id),
    validateData: data => ipcRenderer.invoke('builds:validateData', data),
    exportData: (data, defaultName) => ipcRenderer.invoke('builds:exportData', data, defaultName)
  },
  characters: {
    list: () => ipcRenderer.invoke('characters:list'),
    get: id => ipcRenderer.invoke('characters:get', id),
    create: payload => ipcRenderer.invoke('characters:create', payload),
    update: (id, patch) => ipcRenderer.invoke('characters:update', id, patch),
    setSkillRank: (id, lineId, rank) => ipcRenderer.invoke('characters:setSkillRank', id, lineId, rank),
    setSkillTracking: (id, allocations, completed) => ipcRenderer.invoke('characters:setSkillTracking', id, allocations, completed),
    setGearPiece: (id, stageId, pieceKey, done) => ipcRenderer.invoke('characters:setGearPiece', id, stageId, pieceKey, done),
    incrementCp: (id, tree, amount = 1) => ipcRenderer.invoke('characters:incrementCp', id, tree, amount),
    addTrackedSkillLine: (id, lineId) => ipcRenderer.invoke('characters:addTrackedSkillLine', id, lineId),
    deleteTrackedSkillLine: (id, lineId) => ipcRenderer.invoke('characters:deleteTrackedSkillLine', id, lineId),
    export: id => ipcRenderer.invoke('characters:export', id),
    importBackup: () => ipcRenderer.invoke('characters:importBackup'),
    delete: id => ipcRenderer.invoke('characters:delete', id)
  },
  images: {
    resolve: ref => ipcRenderer.invoke('images:resolve', ref),
    clearCache: () => ipcRenderer.invoke('images:clearCache')
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (k, v) => ipcRenderer.invoke('settings:set', k, v),
    resetApp: () => ipcRenderer.invoke('settings:resetApp')
  },
  db: { getPath: () => ipcRenderer.invoke('db:getPath') },
  external: { open: url => ipcRenderer.invoke('external:open', url) }
})
